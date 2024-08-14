import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import axios from "axios";
import cheerio from "cheerio";
import bodyParser from "body-parser";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5002;
const mongoUrl =
  "mongodb+srv://tusharmegascale:tushar123@cluster0.xlfpxzg.mongodb.net/bhagvatprasadam";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" })); // Adjust size as needed
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log(err);
  });

const urlSchema = new mongoose.Schema({
  url: {
    type: String,
  },
});

const Url = mongoose.model("Url", urlSchema);

const photoSchema = new mongoose.Schema({
  photo: [String],
});

const Photo = mongoose.model("photo", photoSchema);

const userSchema = new mongoose.Schema({
  userId: String,
  password: String,
  role: String,
  username: { type: String, unique: true, required: true },
});
const User = mongoose.model("User", userSchema);

// const PhotoSchemas = new mongoose.Schema({
//   image: { type: String, required: true },
// });

// const Photos = mongoose.model("Photos", PhotoSchemas);

app.get("/add-photo-video", async (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

app.get("/", async (req, res) => {
  res.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Prompt</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        h1 {
            color: #333;
        }
        p {
            color: #666;
        }
        .container {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 20px;
            font-size: 16px;
            color: #fff;
            background-color: #007bff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
        }
        .btn:hover {
            background-color: #0056b3;
        }
    </style>
    <script>
        async function promptForCredentials() {
            const user = sessionStorage.getItem('userId');
            if (user) {
                window.location.pathname = '/add-photo-video';
                return;
            } else {
                const userId = prompt("Please enter your User ID:");
                const password = prompt("Please enter your Password:");
                if (userId && password) {
                    try {
                        const response = await fetch('/login', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ userId, password })
                        });

                        const result = await response.json();
                        sessionStorage.setItem('userId', result.user);
                        sessionStorage.setItem('role', result.role);
                        if (result.message === 'Login successful') {
                            window.location.pathname = '/add-photo-video';
                            return;
                        }
                        alert(result.message);
                    } catch (error) {
                        alert('An error occurred');
                    }
                } else {
                    alert("User ID and Password are required.");
                }
            }
        }

        window.onload = promptForCredentials;
    </script>
</head>
<body>
    <div class="container">
        <h1>Welcome to the Bhagvat Prasadam Login Page</h1>
        <p>Please enter your credentials to proceed.</p>
    </div>
</body>
</html>
    `);
});

app.get("/fetch-users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { userId, password } = req.body;
  console.log(userId, password);
  try {
    const user = await User.findOne({ userId: userId, password: password });

    if (user) {
      res.json({ message: "Login successful", user: userId, role: user.role });
    } else {
      res.json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/add-video", async (req, res) => {
  const { url } = req.body;
  console.log(url);
  try {
    const urlParts = url.split("/");
    const videoId = urlParts[urlParts.length - 1];
    await Url.deleteMany({});
    const newUrl = new Url({ url: "https://www.youtube.com/embed/" + videoId });
    await newUrl.save();
    res.redirect("/");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/upload", upload.array("images"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded.");
  }

  const base64Images = await req.files.map((file) =>
    file.buffer.toString("base64")
  );

  console.log(base64Images);
  // Save the image to MongoDB
  await Photo.deleteMany({});
  const newImage = await Photo.create({ photo: base64Images })
    .then(() => {
      res.redirect("/");
    })
    .catch((error) => {
      console.error("Error saving image:", error);
      res.status(500).send({ message: "Error saving image" });
    });
});

app.get("/images", async (req, res) => {
  try {
    const images = await Photo.find().exec();
    // console.log(images);
    res.json(images);
  } catch (err) {
    res.status(500).send("Error retrieving images: " + err.message);
  }
});

// app.post("/upload", upload.single("image"), (req, res) => {
//   if (!req.file) {
//     return res.status(400).send("No file uploaded.");
//   }

//   const base64Images = req.files.map((file) => file.buffer.toString("base64"));

//   console.log(base64Image);
//   // Save the image to MongoDB
//   const newImage = Photo.create({ photo: base64Image })
//     .then(() => {
//       res.redirect("/");
//     })
//     .catch((error) => {
//       console.error("Error saving image:", error);
//       res.status(500).send({ message: "Error saving image" });
//     });
// });

// app.post("/add-photos", async (req, res) => {
//   const { images } = req.body;

//   if (!images || !Array.isArray(images)) {
//     return res.status(400).send({ message: "Invalid images data" });
//   }

//   try {
//     const photos = images.map((image) => ({ image }));
//     await Photo.insertMany(photos);
//     res.send({ message: "Photos uploaded successfully!" });
//   } catch (error) {
//     console.error("Error saving photos:", error);
//     res.status(500).send({ message: "Error saving photos" });
//   }
// });

// app.post("/add-photos", async (req, res) => {
//   const { postLink } = req.body;
//   if (!postLink) {
//     return res.status(400).json({ error: "Post link is required" });
//   }

//   try {
//     // Fetch the Instagram post page
//     const { data } = await axios.get(postLink);
//     const $ = cheerio.load(data);

//     // Extract image URLs from the Instagram post
//     const imageUrls = [];
//     $('meta[property="og:image"]').each((i, elem) => {
//       imageUrls.push($(elem).attr("content"));
//     });

//     if (imageUrls.length === 0) {
//       return res.status(404).json({ error: "No images found" });
//     }

//     // Store image URLs in MongoDB
//     const photo = new Photo({ photo: imageUrls });
//     await photo.save();

//     // Respond with success
//     //   res.json({ message: 'Image URLs saved successfully' });
//     res.redirect("/");
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "An error occurred" });
//   }
// });

app.get("/fetch", async (req, res) => {
  const urls = await Url.find(); // Fetch existing URLs
  const photos = await Photo.find().exec(); // Fetch existing photos
  res.send({ urls, photos });
});

app.post("/add-user", async (req, res) => {
  const { userId, password, role, username } = req.body;

  if (!userId || !password || !role || !username) {
    return res.status(400).send("All fields are required.");
  }

  try {
    const newUser = new User({ userId, password, role, username });
    await newUser.save();
    res.json({ message: "User added successfully" });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/delete-user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await User.deleteOne({ userId: userId });

    if (result.deletedCount > 0) {
      res.json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

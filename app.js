const cookieParser = require('cookie-parser');
const express = require('express')
const path = require('path')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors');
const mongoose = require('mongoose')



require('dotenv').config();

const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_DB_CONNECTION)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const userModel = require('./models/user-model')
const productModel = require('./models/product-model')

const app = express()

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: process.env.FRONT_END_URL, // Frontend origin
    credentials: true, // To allow cookies
}));

app.use(cookieParser())

app.get("/", (req, res) => {
    res.send("Working")
})

app.post("/register", async (req, res) => {
    let { username, email, password } = req.body;
    let user = await userModel.findOne({ email })
    if (user) return res.status(500).send("User already registered...")

    // this to encrypt password and create a user
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            const user = await userModel.create({
                username,
                email,
                password: hash,
            })

            // login the user after it is created
            let token = jwt.sign({ email: email, userid: user._id }, process.env.MONGO_DB_SECRET, { expiresIn: '1h' })
            res.cookie("token", token)

            res.send("User created successfully.")
        })
    })
})

app.post("/login", async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (!user) return res.status(400).send("Something went wrong.");

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: user.email, userid: user._id }, process.env.MONGO_DB_SECRET, { expiresIn: '1h' });
            res.cookie("token", token);
            res.status(200).send("Login successful.");
        } else {
            res.status(400).send("Something went wrong.");
        }
    });
});

app.post("/logout", isLoggedin, (req, res) => {
    res.cookie("token", "");
    res.status(200).send("Logout successful.");
});

app.get("/profile", isLoggedin, async (req, res) => {
    try {
        const user = await userModel
            .findOne({ email: req.user.email })
            .populate("selling") // Populate the selling field
            .populate("bought"); // Populate the bought field

        if (user) {
            res.json(user); // Return user data with populated fields as JSON
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Internal server error");
    }
});

app.post('/updateprofile', isLoggedin, async (req, res) => {
    const { username, password } = req.body;

    let user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.status(400).send('User not found.');

    if (username) {
        user.username = username;
    }

    if (password) {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                return res.status(500).send('Error generating salt for password.');
            }

            bcrypt.hash(password, salt, async (err, hashedPassword) => {
                if (err) {
                    return res.status(500).send('Error hashing password.');
                }

                user.password = hashedPassword;

                try {
                    await user.save();
                    res.status(200).send('Profile updated successfully.');
                } catch (err) {
                    console.error(err);
                    res.status(500).send('Something went wrong while updating the profile.');
                }
            });
        });
    } else {
        try {
            await user.save();
            res.status(200).send('Profile updated successfully.');
        } catch (err) {
            console.error(err);
            res.status(500).send('Something went wrong while updating the profile.');
        }
    }
});

app.post("/sell", isLoggedin, async (req, res) => {
    try {
        let { productname, location, quality, quantity, description, price, contact } = req.body;
        let user = await userModel.findOne({ email: req.user.email });
        let userid = user._id;

        const data = await productModel.create({
            userid,
            productname,
            location,
            quality,
            quantity,
            description,
            price,
            contact
        });

         // Add the product ID to the user's selling array
         user.selling.push(data._id);
         await user.save();

        res.status(200).send("Product created successfully.");  // Send status 200
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/products", async (req, res) => {
    try {
        // Fetch all products
        const data = await productModel.find();
        
        // Filter out products where sold is true
        const availableProducts = data.filter(product => !product.sold);

        // Check if there are any available products
        if (availableProducts.length > 0) {
            res.json(availableProducts); // Send only unsold products
        } else {
            res.status(404).send("No available products found");
        }
    } catch (error) {
        res.status(500).send("Server error");
    }
});

app.get("/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const data = await productModel.findOne({ _id: id });
        if (data) {
            res.json(data);
        } else {
            res.status(404).send("Product not found");
        }
    } catch (error) {
        res.status(500).send("Server error");
    }
});

app.get("/confirmpurchase/:id", isLoggedin, async (req,res) => {
    const { id } = req.params;
    try {
        const data = await productModel.findOne({ _id: id });
        data.sold = true;
        await data.save()
        
        const user = await userModel.findOne({email : req.user.email})
        user.bought.push(data._id)
        await user.save()
        if (data) {
            res.json(data);
        } else {
            res.status(404).send("Product not found");
        }
    } catch (error) {
        res.status(500).send("Server error");
    }
})

function isLoggedin(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send("You must be logged in.");
    }

    jwt.verify(token, process.env.MONGO_DB_SECRET, (err, data) => {
        if (err) {
            return res.status(401).send("Invalid token.");
        }
        req.user = data;
        next();
    });
}

app.listen(port, () => {
    console.log(`App running on port ${port}`)
})

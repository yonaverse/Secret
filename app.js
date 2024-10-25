import 'dotenv/config';
import express from "express";
import ejs from "ejs";
import pg from "pg";
import argon2 from "argon2";
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session Configuration
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Database Configuration
const db = new pg.Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DB,
    password: process.env.PASS,
    port: process.env.PORT,
});

db.connect();

// Google Strategy Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    (async () => {
      try {
        // Log the profile object to see what we're getting from Google
        console.log("Google Profile:", profile);
        
        const googleId = profile.id;
        const name = profile.displayName;
        // Make sure we're getting the highest quality profile picture
        const profilePicture = profile.photos && profile.photos.length > 0 
          ? profile.photos[0].value.replace('s96-c', 's400-c')  // Request a larger image
          : null;

        console.log("Profile Picture URL:", profilePicture); // For debugging

        const result = await db.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
        let user;
        
        if (result.rows.length === 0) {
          // Insert new user with profile picture
          const insertResult = await db.query(
            "INSERT INTO users (google_id, name, profile_picture) VALUES ($1, $2, $3) RETURNING *",
            [googleId, name, profilePicture]
          );
          user = insertResult.rows[0];
        } else {
          // Update existing user's profile picture
          const updateResult = await db.query(
            "UPDATE users SET name = $1, profile_picture = $2 WHERE google_id = $3 RETURNING *",
            [name, profilePicture, googleId]
          );
          user = updateResult.rows[0];
        }
        
        return cb(null, user);
      } catch (err) {
        console.error("Error in Google Strategy:", err);
        return cb(err);
      }
    })();
  }
));

// Local Strategy Configuration
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (result.rows.length === 0) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        
        const user = result.rows[0];
        const passwordMatch = await argon2.verify(user.password, password);

        if (!passwordMatch) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        done(null, result.rows[0]);
    } catch (error) {
        done(error);
    }
});

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// Routes
app.get("/auth/google", passport.authenticate("google", { 
    scope: ["profile", "email"]  // Request both profile and email scopes
}));


app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("/secrets");
    }
);

app.get("/", (req, res) => {
    res.render("home");
});

// Updated secrets route to fetch all secrets with user information

app.get("/secrets", isAuthenticated, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT secrets.secret, secrets.user_id, 
                   users.name, users.profile_picture 
            FROM secrets 
            JOIN users ON secrets.user_id = users.id 
            ORDER BY secrets.user_id DESC
        `);
        
        res.render("secrets", {
            secrets: result.rows,
            currentUser: req.user
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});



























app.get("/submit", isAuthenticated, (req, res) => {
    res.render("submit");
});

app.post("/submit", isAuthenticated, async (req, res) => {
    try {
        const secret = req.body.secret;
        await db.query(
            "INSERT INTO secrets (secret, user_id) VALUES ($1, $2)",
            [secret, req.user.id]
        );
        res.redirect("/secrets");
    } catch (error) {
        console.error(error);
        res.redirect("/submit");
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    try {
        const email = req.body.email;
        const password = await argon2.hash(req.body.password);
        
        const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, password]
        );

        req.login(result.rows[0], (err) => {
            if (err) {
                console.error(err);
                return res.redirect('/login');
            }
            return res.redirect('/secrets');
        });
    } catch (error) {
        console.error(error);
        res.redirect('/register');
    }
});

app.post("/login", passport.authenticate('local', {
    successRedirect: '/secrets',
    failureRedirect: '/login'
}));

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
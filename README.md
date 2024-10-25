                          
░██████╗███████╗░█████╗░██████╗░███████╗████████╗░██████╗
██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔════╝
╚█████╗░█████╗░░██║░░╚═╝██████╔╝█████╗░░░░░██║░░░╚█████╗░
░╚═══██╗██╔══╝░░██║░░██╗██╔══██╗██╔══╝░░░░░██║░░░░╚═══██╗
██████╔╝███████╗╚█████╔╝██║░░██║███████╗░░░██║░░░██████╔╝
╚═════╝░╚══════╝░╚════╝░╚═╝░░╚═╝╚══════╝░░░╚═╝░░░╚═════╝░                       
secrets is a web app that allows you to shere secrets anonymously with the world.

**Installation**                         
colne this repository 
```bash
  git clone https://github.com/yonaverse/Secret.git
```

Install dependencies

```bash
  npm install
```
create .env file and add the following enviromental variables 
```bash
USER="postgres"
HOST="localhost"
DB="secrets"
PASS="your postgres password"
PORT=5432
SECRET="add a random string used to sign and encrypt session cookies"
CLIENT_ID=add the client_id from https://developers.google.com/
CLIENT_SECRET=add client secret from https://developers.google.com/

```
create a databse called secrets
```bash
CREATE DATABASE secrets
```
create users and secrets tables 
```bash
CREATE TABLE  users (
    id SERIAL PRIMARY KEY,
    email TEXT,
    password TEXT,
    google_id TEXT,
    name TEXT,
    profile_picture TEXT
);
```

```bash

CREATE TABLE  secrets (
    user_id INTEGER REFERENCES users(id),
    secret TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_secrets_user_id ON secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
```
Start the server

```bash
  nodemon app.js
```



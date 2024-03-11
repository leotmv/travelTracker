import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

const port = 3001;
const app = express();

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "world",
    password: "", //you need to have some register in pgAdmin4. After this, you need to insert your pswd here.
    port: 5432,
});

db.connect();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

//currentUserId is used to start our prog
let currentUserId = 1;

async function getVisitedCountry() {
    const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1",
    [currentUserId]
    );
    let arrayCcode = [];
    result.rows.forEach((code) => {
        arrayCcode.push(code.country_code);
    });
    return arrayCcode;
}

let users = [];
async function getUser() {
    const consult = await db.query("SELECT * FROM users");
    users = consult.rows;
    return users.find((user) => user.id == currentUserId);
}

//done
app.post('/home', async (req, res) =>{
    res.redirect('/');
})

//done
app.get("/", async (req, res) => {
    const usersArr = await getUser();
    const visitedCountriesArr = await getVisitedCountry();
    res.render("index.ejs", {
        users: users,
        total: visitedCountriesArr.length,
        countries: visitedCountriesArr,
        color: usersArr.color
    });
});

//done
app.post("/user", async (req, res) => {
    res.render("new.ejs");
});

//done
app.post("/new", async (req, res) => {
    const user = req.body.name;
    const chosenColor = req.body.color;
    try {
        await db.query(
            "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *",
            [user.toLowerCase(), chosenColor]
        );
        res.redirect("/");

    } catch (error) {
        console.log(error.message)
        res.render("new.ejs", {
            nameTwice: "That name has already been registered. Try another one"
        });
    }
});

//done
app.post("/deleteUser", async (req, res) =>{
    await getUser();
    res.render("delete.ejs", {
        users: users
    });
});

//done
app.post("/currentUsers", async (req, res) => {
    const name = req.body.buttonClicked;
    const choice = req.body.radioCheck;
    const colorConsult = await db.query(
        "SELECT color FROM users WHERE name = $1",
        [name]
    );
    const color = colorConsult.rows[0].color;
    console.log(color);
    console.log(currentUserId);
    console.log(name);
    if (choice === "no"){
        await getUser();
        res.render("delete.ejs",{users: users});
    }else{
        await db.query(
            "DELETE FROM visited_countries WHERE user_id = $1",
            [currentUserId]
        );
        await db.query(
            "DELETE FROM users WHERE name = $1 AND color = $2;",
            [name, color]
        );
        await getUser();
        res.redirect("/");
    }
});

//done
app.post("/add", async (req, res) => {
    const input = req.body["country"].split(',');
    try {
        const result = await db.query(
            "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
            [input[0].toLowerCase()]
        );
        const data = result.rows[0];
        const countryCode = data.country_code;
        try {
            await db.query(
                "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
                [countryCode, currentUserId]
            );
            res.redirect("/");
        } catch (error) {
            const countries = await getVisitedCountry();
            console.log(error.message);
            res.render("index.ejs", {
                countries: countries,
                total: countries.length,
                error: "That country has already been added."
            });
        }
    } catch (error) {
        const countries = await getVisitedCountry();
        console.log(error.message);
        res.render("/", {
            countries: countries,
            total: countries.length,
            error: "That country does not exist."
        });
    }
});

//done
app.post("/delete", async (req,res)=>{
    const input = req.body["country"].split(',');
    await db.query("DELETE FROM visited_countries WHERE user_id = $1 AND country_code = $2",
        [currentUserId, input[1]]
    );
    res.redirect("/");
});

//done
app.post("/input", async (req, res) => {
    const buttonClicked = req.body.inputClicked;
    const result = await db.query("SELECT id FROM users WHERE name = $1",
        [buttonClicked]
    );
    currentUserId = result.rows[0].id;
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});


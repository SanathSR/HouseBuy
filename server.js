const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const XLSX = require("xlsx");
const expressLayouts = require("express-ejs-layouts");

const db = require("./db");

require("dotenv").config();

const app = express();

app.set("view engine", "ejs");

app.use(expressLayouts);
app.set("layout", "layout");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(methodOverride("_method"));

function checkPassword(req, res, next) {
    const password = req.body.password || req.query.password;

    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Unauthorised"
        });
    }

    next();
}

/* DASHBOARD */

app.get("/", async (req, res) => {
    const result =
    await db.query(
        "SELECT * FROM transactions ORDER BY payment_date DESC"
    );

    const data = result.rows;

    const total =
    data.reduce(
        (sum, t) =>
        sum + Number(t.amount),
        0
    );

    const count =
    data.length;

    res.render(
        "dashboard",
        {
            data,
            total,
            count
        }
    );

});



/* ADD PAGE */

app.get("/add", (req, res) => {

    res.render("add");

});



/* SAVE */

app.post("/add", async (req, res) => {

    const {
        payment_date,
        amount,
        purpose,
        comments,
        paid_by,
        other_person,
        payment_mode
    } = req.body;

    await db.query(

        `INSERT INTO transactions
        (
            payment_date,
            amount,
            purpose,
            comments,
            paid_by,
            other_person,
            payment_mode
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,

        [
            payment_date,
            amount,
            purpose,
            comments,
            paid_by,
            other_person,
            payment_mode
        ]

    );

    res.redirect("/");

});


app.get("/list", async (req, res) => {

    const { from, to, paid_by, sort } = req.query;

    let query = "SELECT * FROM transactions WHERE 1=1";
    const values = [];
    let i = 1;

    // FILTERS

    if (from) {
        query += ` AND payment_date >= $${i++}`;
        values.push(from);
    }

    if (to) {
        query += ` AND payment_date <= $${i++}`;
        values.push(to);
    }

    if (paid_by) {
        query += ` AND paid_by = $${i++}`;
        values.push(paid_by);
    }

    // SORTING

    if (sort === "amount_asc") {
        query += " ORDER BY amount ASC";
    } else if (sort === "amount_desc") {
        query += " ORDER BY amount DESC";
    } else if (sort === "date_asc") {
        query += " ORDER BY payment_date ASC";
    } else {
        query += " ORDER BY payment_date DESC";
    }

    const result = await db.query(query, values);

    res.render("list", {
        data: result.rows,
        query: req.query
    });

});


/* EDIT */

app.get("/edit/:id",
async (req, res) => {

    const result =
    await db.query(

        "SELECT * FROM transactions WHERE id=$1",

        [req.params.id]

    );

    res.render(
        "edit",
        { t: result.rows[0] }
    );

});



app.put("/edit/:id", checkPassword, async (req, res) => {

    const {
        payment_date,
        amount,
        purpose,
        comments,
        paid_by,
        other_person,
        payment_mode
    } = req.body;

    await db.query(

        `UPDATE transactions
         SET
            payment_date=$1,
            amount=$2,
            purpose=$3,
            comments=$4,
            paid_by=$5,
            other_person=$6,
            payment_mode=$7
         WHERE id=$8`,

        [
            payment_date,
            amount,
            purpose,
            comments,
            paid_by,
            other_person,
            payment_mode,
            req.params.id
        ]

    );

    res.redirect("/");

});



/* DELETE */

app.delete("/delete/:id", checkPassword, async (req, res) => {

    await db.query(

        "DELETE FROM transactions WHERE id=$1",

        [req.params.id]

    );

    res.redirect("/");

});



/* EXPORT */

app.get("/export",
async (req, res) => {

    const result =
    await db.query(
        "SELECT * FROM transactions"
    );

    const ws =
    XLSX.utils.json_to_sheet(
        result.rows
    );

    const wb =
    XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        wb,
        ws,
        "Transactions"
    );

    const file =
    XLSX.write(
        wb,
        {
            type: "buffer",
            bookType: "xlsx"
        }
    );

    res.setHeader(
        "Content-Disposition",
        "attachment; filename=transactions.xlsx"
    );

    res.send(file);

});



app.listen(
process.env.PORT,
() => {

console.log(
"Server running on port " +
process.env.PORT
);

});
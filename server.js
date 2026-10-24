const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const XLSX = require("xlsx");
const expressLayouts = require("express-ejs-layouts");

const { pool, initializeDatabase } = require('./db');

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
    try {
        const result = await pool.query(
            "SELECT * FROM transactions ORDER BY payment_date DESC"
        );

        const data = result.rows;

        const total = data.reduce(
            (sum, t) => sum + Number(t.amount || 0), 0
        );

        const count = data.length;

        const buyData = data.filter(
            t => (t.paid_for || "").toLowerCase() === "purchase"
        );

        const constructionData = data.filter(
            t => (t.paid_for || "").toLowerCase() === "construction"
        );

        const buyTotal = buyData.reduce(
            (sum, t) => sum + Number(t.amount || 0), 0
        );

        const constructionTotal = constructionData.reduce(
            (sum, t) => sum + Number(t.amount || 0), 0
        );

        // Group transaction amounts by a field
        function makePieData(rows, field) {
            const totals = {};

            rows.forEach(t => {
                let label;

                if (field === "paid_by") {
                    label = t.paid_by === "Other"
                        ? (t.other_person || "Other")
                        : (t.paid_by || "Unknown");
                } else {
                    label = t.payment_mode || "Unknown";
                }

                totals[label] = (totals[label] || 0)
                    + Number(t.amount || 0);
            });

            return {
                labels: Object.keys(totals),
                values: Object.values(totals)
            };
        }

        const charts = {
            buyPaidBy: makePieData(buyData, "paid_by"),
            constructionPaidBy: makePieData(constructionData, "paid_by"),
            buyMode: makePieData(buyData, "payment_mode"),
            constructionMode: makePieData(constructionData, "payment_mode")
        };

        // Safely serialize database-derived labels for use in script tags.
        const chartJson = JSON.stringify(charts)
            .replace(/</g, "\\u003c");

        res.render("dashboard", {
            data,
            total,
            count,
            buyTotal,
            constructionTotal,
            chartJson
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Error loading dashboard");
    }
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
        payment_mode,
        paid_for
    } = req.body;

    await pool.query(

        `INSERT INTO transactions
        (
            payment_date,
            amount,
            purpose,
            comments,
            paid_by,
            other_person,
            payment_mode,
            paid_for
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,

        [
            payment_date,
            amount,
            purpose,
            comments,
            paid_by,
            other_person,
            payment_mode,
            paid_for
        ]

    );

    res.redirect("/");

});


app.get("/list", async (req, res) => {

    const { from, to, paid_by, paid_for, sort } = req.query;

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

    if (paid_for) {
        query += ` AND paid_for <= $${i++}`;
        values.push(paid_for);
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

    const result = await pool.query(query, values);

    res.render("list", {
        data: result.rows,
        query: req.query
    });

});


/* EDIT */

app.get("/edit/:id",
    async (req, res) => {

        const result =
            await pool.query(

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
        payment_mode,
        paid_for
    } = req.body;

    await pool.query(

        `UPDATE transactions
         SET
            payment_date=$1,
            amount=$2,
            purpose=$3,
            comments=$4,
            paid_by=$5,
            other_person=$6,
            payment_mode=$7,
            paid_for=$8
         WHERE id=$9`,

        [
            payment_date,
            amount,
            purpose,
            comments,
            paid_by,
            other_person,
            payment_mode,
            paid_for,
            req.params.id
        ]

    );

    res.redirect("/");

});



/* DELETE */

app.delete("/delete/:id", checkPassword, async (req, res) => {

    await pool.query(

        "DELETE FROM transactions WHERE id=$1",

        [req.params.id]

    );

    res.redirect("/");

});



/* EXPORT */

app.get("/export",
    async (req, res) => {

        const result =
            await pool.query(
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

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error('Unable to start application:', err.message);
    process.exit(1);
  }
}
startServer();

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId, serialize } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ueh5c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const dataBase = client.db('Hostel-Management');
        const mealCollection = dataBase.collection('meals');
        const userCollection = dataBase.collection('users');

        // meal related api 

        //api for getting all meals
        app.get('/meals', async (req, res) => {

            // const sorted = req.query?.sorted;
            // const search = req.query?.search; //console.log(search)
            // const category = req.query?.category; console.log(category)

            const { search, category, min, max } = req.query;

            // let sortQuery = {};
            // if (sorted == 'true') {
            //     sortQuery = { expired_datetime: -1 }  //change expired_datetime 
            // }

            let searchQuery = {};

            if (search) {
                searchQuery = { name: { $regex: new RegExp(search, 'i') } };
            }

            if (category) {
                searchQuery.category = category;
            }

            if (min || max) {

                searchQuery.price = {};

                if (min) searchQuery.price.$gte = parseFloat(min);
                if (max) searchQuery.price.$lte = parseFloat(max);
            }

            const cursor = mealCollection.find(searchQuery).sort();

            const result = await cursor.toArray(); console.log(result);

            res.send(result);
        })

        // api for getting a specific meal based on id 
        app.get('/meals/:id', async (req, res) => {

            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const result = await mealCollection.findOne(query);

            res.send(result);

        })

        // api for updating reaction count in meal 

        app.patch('/meal/like/:id', async (req, res) => {

            const id = req.params.id;

            const reactionCount = await req.body.reactionCount;

            // console.log(req.body);

            const query = { _id: new ObjectId(id) };

            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    reactionCount
                }
            }

            const result = await mealCollection.updateOne(query, updateDoc, options);

            res.send(result)
        })

        //users related api

        app.post('/user', async (req, res) => {

            const user = req.body; //console.log(user);

            const result = await userCollection.insertOne(user);
            res.send(result);
        })



    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello Server ')
})

app.listen(port, () => {
    console.log(`server is running properly at : ${port}`);
})

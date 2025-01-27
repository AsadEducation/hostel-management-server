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
        const reviewCollection = dataBase.collection('reviews');

        // meal related api 

        //api for getting all meals
        app.get('/meals', async (req, res) => {

            const { search, category, min, max } = req.query; //console.log(req.query);

            let searchQuery = {};

            if (search && search !== 'undefined') {
                searchQuery = { name: { $regex: new RegExp(search, 'i') } };
            }

            if (category && search !== 'undefined') {
                searchQuery.category = category;
            }

            if ((min || max) && (min !== 'undefined' && max !== 'undefined')) {

                searchQuery.price = {};

                if (min) searchQuery.price.$gte = parseFloat(min);
                if (max) searchQuery.price.$lte = parseFloat(max);
            }

            //console.log(searchQuery)

            const cursor = mealCollection.find(searchQuery);

            const result = await cursor.toArray(); //console.log(result);

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

        //review related api

        // api for getting review count from db 
        app.get('/review-count', async (req, res) => {

            const reviewCount = await reviewCollection.estimatedDocumentCount();
            res.send({ reviewCount });

        })
        // api for getting all reviews  from db 
        app.get('/reviews', async (req, res) => {

            // const result = await reviewCollection.find().toArray();
            // res.send(result);

            const email = req?.query?.email; console.log(email);

            let query = {};

            if (email && email !== 'undefined') {
                query.email = email;
            }

            const result = await reviewCollection.find(query).toArray(); console.log(result)
            res.send(result);


        })
        // api for posting user reviews to db 
        app.post('/review', async (req, res) => {
            const review = req.body;

            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        //api for updating user review 
        app.patch('/review/:id', async (req, res) => {

            const reviewText = req.body.reviewText;
            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    reviewText
                }
            }

            const result = await reviewCollection.updateOne(query, updateDoc);
            res.send(result);

        })
        // api for deleting a review 
        app.delete('/review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })

        //users related api

        // api for getting user
        app.get('/users', async (req, res) => {

            const email = req?.query?.email; //console.log(email);

            let query = {};

            if (email && email !== 'undefined') {
                query.email = email;
            }

            const result = await userCollection.find(query).toArray();// console.log(result)
            res.send(result);

        })
        // api for updating user role as admin 
        app.patch('/user/admin/:id', async (req, res) => {

            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    role: "Admin"
                }
            }

            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        })
        // api for adding a unique user in db 
        app.post('/user', async (req, res) => {

            const user = req.body; // console.log(user);

            const query = { email: user?.email }

            const existingUser = await userCollection.findOne(query);  // console.log('exists', existingUser);

            if (existingUser) {
                // console.log('returning');
                return res.send({ message: 'user already exists ', insertedId: null })
            }

            const result = await userCollection.insertOne(user);

            return res.send(result);

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

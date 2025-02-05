const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, serialize } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());
app.use(cors({ origin: ['https://hostel-management-32.web.app', 'http://localhost:5173'] }));
const stripe = require('stripe')(process.env.STRIPE_SECRET)

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
        const upcomingCollection = dataBase.collection('upcoming');
        const paymentCollection = dataBase.collection('payment');
        const requestedCollection = dataBase.collection('RequestedMeal');

        //custom middleware
        //if you face any issue it will be because of verify token middleware next
        const verifyToken = (req, res, next) => {

            const token = req?.headers?.auth; //console.log('token from middle ware ', token)

            if (!token) {
                return res.status(401).send({ message: 'unauthorized access ? no token' })
            }

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

                if (err) {
                    return res.status(401).send({ message: 'unauthorized access ? invalid token' })
                }

                req.decoded = decoded;// console.log('decoded from verify token ', req.decoded)

                next();
            })

        }
        const verifyAdmin = async (req, res, next) => {

            const user = await userCollection.findOne({ email: req.decoded.email });

            const isAdmin = user?.role === 'Admin' || user?.role === 'admin';

            //this lines of code below creating error when a logged in user is not admin  and interceptor taking the 403 and navigating to login

            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            req.isAdmin = isAdmin;

            next()

        }

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;

            //encrypting users data as a token
            const token = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })
        })

        // meal related api 

        //api for getting all meals
        app.get('/meals', async (req, res) => {

            const { search, category, min, max, sortByLikes, sortByReviewCount, email } = req?.query; //console.log(req.query);

            let searchQuery = {};
            let sortQuery = {};

            // sort queries 

            if (sortByLikes == 'true') {
                sortQuery = { reactionCount: -1 }
            }
            if (sortByReviewCount == 'true') {
                sortQuery = { reviews_count: -1 }
            }
            //search queries

            if (email && email !== 'undefined') {
                searchQuery.distributorEmail = email
            }
            if (search && search !== 'undefined') {
                searchQuery = { name: { $regex: new RegExp(search, 'i') } };
            }

            if (category && category !== 'undefined') {
                searchQuery.category = category;
            }

            if ((min || max) && (min !== 'undefined' && max !== 'undefined')) {

                searchQuery.price = {};

                if (min) searchQuery.price.$gte = parseFloat(min);
                if (max) searchQuery.price.$lte = parseFloat(max);
            }

            //console.log('search and sort queries', searchQuery, sortQuery)

            const cursor = mealCollection.find(searchQuery).sort(sortQuery);

            const result = await cursor.toArray(); //console.log(result);

            res.send(result);
        })
        // api for getting a specific meal based on id 
        app.get('/meals/:id', async (req, res) => {

            const id = req.params.id;// console.log(id);

            const query = { _id: new ObjectId(id) }; //console.log(query);

            let result = await mealCollection.findOne(query);

            //taking precaution if some has inserted a object in mongodb with a _id: in the object ;
            if (!result) {
                result = await mealCollection.findOne({ _id: id });
            }

            res.send(result);

        })
        // api for adding meal data into db 
        app.post('/meals', verifyToken, async (req, res) => {

            const mealItem = req.body; //console.log(mealItem);
            const result = await mealCollection.insertOne(mealItem);
            res.send(result);
        })
        //api for updating single meal
        app.patch('/meal/:id', verifyToken, verifyAdmin, async (req, res) => {

            const mealItem = req.body;

            const {
                name,
                details,
                image: display_url,
                category,
                price,
                mealType,
                distributorName,
                distributorEmail,
                ingredients,
                postTime,
            } = mealItem

            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    name,
                    details,
                    image: display_url,
                    category,
                    price,
                    mealType,
                    distributorName,
                    distributorEmail,
                    ingredients,
                    postTime,
                }
            }

            const result = await mealCollection.updateOne(query, updateDoc);
            res.send(result);

        })
        // api for updating reaction count in meal 
        app.patch('/meal/like/:id', verifyToken, async (req, res) => {

            const id = req.params.id; //console.log('id', id);

            const reactionCount = req?.body?.reactionCount;  // console.log(req.body);

            const query = { _id: new ObjectId(id) };//-------------critical area if there is no object id with object it will cause error

            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    reactionCount
                }
            }

            const result = await mealCollection.updateOne(query, updateDoc, options);

            res.send(result)
        })
        //api for deleting single meal
        app.delete('/meal/:id', verifyToken, verifyAdmin, async (req, res) => {

            const id = req.params.id;// console.log(id);

            const query = { _id: new ObjectId(id) }

            const result = await mealCollection.deleteOne(query); //console.log(result);

            res.send(result);

        })


        //review related api

        // api for getting review count from db 
        app.get('/review-count', async (req, res) => {

            const reviewCount = await reviewCollection.estimatedDocumentCount();
            res.send({ reviewCount });

        })
        // api for getting all reviews  from db 
        app.get('/reviews', async (req, res) => {

            const email = req?.query?.email;
            const meal_id = req?.query?.meal_id; //console.log(req?.query?.meal_id);

            let query = {};

            if (email && email !== 'undefined') {
                query.user_email = email;
            }
            if (meal_id && meal_id !== 'undefined') {
                query.meal_id = meal_id;
            }
            // console.log(query)

            const result = await reviewCollection.find(query).toArray(); console.log(result)
            res.send(result);


        })
        // api for posting user reviews to db 
        app.post('/review', verifyToken, async (req, res) => {
            const review = req.body;

            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        //api for updating user review 
        app.patch('/review/:id', verifyToken, async (req, res) => {

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
        app.delete('/review/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })

        //users related api

        // api for getting user
        app.get('/users', verifyToken, async (req, res) => {

            const email = req?.query?.email; console.log(req.query);
            const searchName = req?.query?.searchName;
            const searchMail = req?.query?.searchMail;

            let query = {};

            if (email && email !== 'undefined') {
                query.email = email;
            }
            if (searchName && searchName !== 'undefined') {
                query.name = { $regex: new RegExp(searchName, 'i') }
            }
            if (searchMail && searchMail !== 'undefined') {
                query.email = { $regex: new RegExp(searchMail, 'i') }
            }

            const result = await userCollection.find(query).toArray(); //console.log(result)
            res.send(result);

        })
        // api for checking admin or not 
        app.get('/user/admin/:email', verifyToken, async (req, res) => {

            const email = req?.params?.email;
            const query = { email };

            const user = await userCollection.findOne(query); //console.log(user);

            const isAdmin = user?.role === 'admin' || user?.role === 'Admin'; //console.log(isAdmin);
            res.send({ isAdmin })

        })
        // api for updating user role as admin 
        app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {

            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const options = { upsert: true }

            const updateDoc = {
                $set: {
                    role: "Admin"
                }
            }

            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })
        //api for updating users membership and payment status 
        app.patch('/user/:email', verifyToken, async (req, res) => {

            const email = req.params.email; (email);

            const membership = req.query?.membership; //console.log(req.query);

            const query = { email: email }; //console.log(query);

            const options = { upsert: true }

            const updateDoc = {
                $set: {
                    membership,
                }
            }

            const result = await userCollection.updateOne(query, updateDoc, options); //console.log(result);
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

        //upcoming meal related api

        //api for upcoming meals
        app.get('/upcoming', async (req, res) => {

            const sorted = req?.query?.sorted; //console.log(req.query);
            let sortQuery = {}

            if (sorted == 'true') {
                sortQuery = { reactionCount: -1 }
            }
            const result = await upcomingCollection.find().sort(sortQuery).toArray();// console.log(result);
            res.send(result);

        })
        //api for adding upcoming meal
        app.post('/upcoming', verifyToken, async (req, res) => {
            const mealItem = req.body; //console.log(mealItem);
            const result = await upcomingCollection.insertOne(mealItem);
            res.send(result);
        })
        // api for updating reaction count in upcoming meal 
        app.patch('/upcoming/reactionCount/:id', verifyToken, async (req, res) => {

            const id = req.params.id; //console.log('id', id);

            const reactionCount = req?.body?.reactionCount;  // console.log(req.body);

            const query = { _id: new ObjectId(id) };//-------------critical area if there is no object id with object it will cause error


            const updateDoc = {
                $set: {
                    reactionCount
                }
            }

            const result = await upcomingCollection.updateOne(query, updateDoc);

            res.send(result)
        })
        //api for deleting upcoming meals
        app.delete('/upcoming/:id', verifyToken, async (req, res) => {
            const id = req.params.id; //console.log(id);
            const query = { _id: new ObjectId(id) };

            const result = await upcomingCollection.deleteOne(query);
            res.send(result);
        })


        //Requested Meal related api


        // api for getting all requested meal 
        app.get('/requested-meal', verifyToken, async (req, res) => {

            const email = req?.query?.email; console.log(req.query);
            const searchName = req?.query?.searchName;
            const searchMail = req?.query?.searchMail;

            let query = {};

            if (email && email !== 'undefined') {
                query.user_email = email; //console.log(query);
            }
            if (searchName && searchName !== 'undefined') {
                query.user_name = { $regex: new RegExp(searchName, 'i') }
            }
            if (searchMail && searchMail !== 'undefined') {
                query.user_email = { $regex: new RegExp(searchMail, 'i') }
            }
            const result = await requestedCollection.find(query).toArray(); console.log(result);
            res.send(result)

        })
        //api for adding a requested meal
        app.post('/requested-meal', verifyToken, async (req, res) => {

            const reqItem = req.body;// console.log(reqItem);
            const result = await requestedCollection.insertOne(reqItem); //console.log(result);
            res.send(result);
        })
        // api for updating status to served in serve meal
        app.patch('/requested-meal/:id', verifyToken, verifyAdmin, async (req, res) => {

            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    status: "Delivered"
                }
            }
            const result = await requestedCollection.updateOne(query, updateDoc);
            res.send(result);

        })
        //api for cancelling request
        app.delete('/requested-meal/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await requestedCollection.deleteOne(query);
            res.send(result);
        })



        //payment related api

        //api for getting all payment of a user
        app.get('/payment', verifyToken, async (req, res) => {

            const email = req?.query?.email; console.log(email);

            let query = {};

            if (email && email !== 'undefined') {
                query = { user_email: email }
            }

            const result = await paymentCollection.find(query).toArray(); console.log(result);
            res.send(result);

        })
        // api for payment intent 
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });
        // api for adding payment into db payment collection
        app.post('/payment', verifyToken, async (req, res) => {

            const payment = req.body; console.log(payment);
            const result = await paymentCollection.insertOne(payment);
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

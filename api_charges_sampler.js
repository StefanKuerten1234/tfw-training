const { MongoClient } = require('mongodb');

const args = process.argv.slice(2); // Get command-line arguments

// Parse named parameters
const params = {};
args.forEach(arg => {
    if (arg.startsWith('--')) {
        const index = arg.indexOf('=');
        if (index !== -1) {
            const key = arg.slice(2, index); // Extract key (remove '--')
            const value = arg.slice(index + 1); // Everything after '=' is the value
            params[key] = value;
        }
    }
});

// Access the parameters
const uri = params.uri; // MongoDB URI
const dbName = params.database; // Database name
const collectionName = params.collection; // Collection name
const numQueries = parseInt(params.numQueries); // How many queries to generate

if (!uri || !dbName || !collectionName || !numQueries) {
    console.error("Missing required parameters. Usage: node api_charges_sampler.js --uri=<uri> --database=<database> --collection=<collection> --numQueries=<numQueries>");
    process.exit(1);
}

const client = new MongoClient(uri);

async function fetchRandomDocuments() {
    const client = new MongoClient(uri);

    try {
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const randomDocuments = await collection.aggregate([{ $sample: { size: numQueries } }]).toArray();

        const transformedDocuments = randomDocuments.map(doc => ({
            odcountry: doc.odcountry,
            PricingLevel: doc.PricingLevel,
            originUnlocode: doc.originUnlocode,
            pickupZone: doc.pickupZone,
            pickupCity: doc.pickupCity,
            destinationUnlocode: doc.destinationUnlocode,
            deliveryZone: doc.deliveryZone,
            deliveryCity: doc.deliveryCity
        }));
        console.log(JSON.stringify(transformedDocuments, null, 2));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

async function sampleAndGenerateQueries() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Step 1: Sample random values for the query parameters
        const sampledOrigins = await collection
            .aggregate([
                { $match: { PricingLevel: "S", pickupPostCodeFrom: { $ne: null } } },
                { $sample: { size: numQueries } },
                {
                    $project: {
                        _id: 0,
                        odcountry: 1,
                        originUnlocode: 1,
                        pickupZone: 1,
                        pickupCity: 1,
                        destinationUnlocode: 1,
                        deliveryZone: 1,
                        deliveryCity: 1,
                    },
                },
            ])
            .toArray();

        // Step 2: Format the sampled values into Query 2 structures
        const queries = sampledOrigins.map((doc) => ({
            odcountry: doc.odcountry || "ZZ-ZZ", // Default fallback
            PricingLevel: ["S", "Z"], // Pricing level remains fixed
            originUnlocode: doc.originUnlocode || "BEANR",
            pickupZone: doc.pickupZone || "33520",
            pickupCity: doc.pickupCity || "33520",
            destinationUnlocode: doc.destinationUnlocode || "NLRTM",
            deliveryZone: doc.deliveryZone || "3341",
            deliveryCity: doc.deliveryCity || "3341",
        }));

        // Step 3: Output the queries to stdout
        console.log("Generated Queries:");
        console.log(JSON.stringify(queries, null, 2));
    } catch (err) {
        console.error("Error occurred while sampling data and generating queries:", err);
    } finally {
        await client.close();
        console.log("Disconnected from MongoDB");
    }
}

fetchRandomDocuments();
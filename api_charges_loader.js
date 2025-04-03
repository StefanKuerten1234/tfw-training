const { faker } = require('@faker-js/faker');
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

if (!uri || !dbName || !collectionName) {
    console.error("Missing required parameters. Usage: node api_charges_loader.js --uri=<uri> --database=<database> --collection=<collection>");
    process.exit(1);
}

console.log(`URI: ${uri}`);
console.log(`Database: ${dbName}`);
console.log(`Collection: ${collectionName}`);

const client = new MongoClient(uri);

const create_api_charge = () => ({
    rateID: faker.number.int({ min: 1000, max: 9999 }),
    chargenum: faker.number.int({ min: 1000, max: 9999 }),
    product: faker.commerce.productName(),
    PricingLevel: faker.helpers.arrayElement(["Standard", "Premium", "Economy"]),
    chargeCategory: faker.helpers.arrayElement(["Freight", "Fuel", "Handling"]),
    rateType: faker.helpers.arrayElement(["Flat", "Variable", "Tiered"]),
    originUnlocode: faker.location.countryCode(), 
    originIata: faker.location.city().substring(0, 3).toUpperCase(), 
    originCountry: faker.location.country(),
    pickupZone: faker.helpers.arrayElement(["Zone 1", "Zone 2", "Zone 3"]),
    pickupCity: faker.location.city(),
    pickupPostCodeFrom: faker.location.zipCode(),
    pickupPostCodeTo: faker.location.zipCode(),
    destinationUnlocode: faker.location.countryCode(),
    destinationIata: faker.location.city().substring(0, 3).toUpperCase(),
    destinationCountry: faker.location.country(),
    odcountry: faker.location.country(),
    deliveryZone: faker.helpers.arrayElement(["Zone A", "Zone B", "Zone C"]),
    deliveryPostCodeFrom: faker.location.zipCode(),
    deliveryPostCodeTo: faker.location.zipCode(),
    deliveryCity: faker.location.city(),
    billingCountry: faker.location.country(),
    serviceLevel: faker.helpers.arrayElement(["Express", "Standard", "Overnight"]),
    commodityCode: faker.string.alphanumeric(10), 
    containerType: faker.helpers.arrayElement(["20ft", "40ft", "Reefer"]),
    mode: faker.helpers.arrayElement(["Air", "Sea", "Road"]),
    direction: faker.helpers.arrayElement(["Inbound", "Outbound"]),
    depot: faker.helpers.arrayElement(["Depot A", "Depot B", "Depot C"]),
    SKU: faker.string.alphanumeric(8),
    validFrom: faker.date.past({ years: 1 }).toISOString().split("T")[0],
    validTo: faker.date.future({ years: 1 }).toISOString().split("T")[0],
    JSONdata: {
        rateID: faker.number.int({ min: 1000, max: 9999 }),
        chargeCode: faker.helpers.arrayElement(["DICP", "DTHC", "DPOR", "OPUB", "OOFF", "DPIE", "DEQC"]),
        chargeDescription: faker.word.words({ count: { min: 4, max: 8 } }),
        chargeCategory: faker.helpers.arrayElement(["Destination", "Pickup"]),
        rateType: faker.helpers.arrayElement(["DST","DSTO", "PUB"]),
        localCharge: faker.helpers.arrayElement(["N", "Y"]),
        originCountry: faker.location.countryCode(),
        destinationCountry: faker.location.countryCode(),
        currency: faker.finance.currencyCode(),
        convFactor: "1:1",
        chargeApplicability: "M",
        validFrom: faker.date.past({ years: 1 }).toISOString().split("T")[0],
        validTo: faker.date.future({ years: 1 }).toISOString().split("T")[0],
        updated: faker.date.past({ years: 1 }).toISOString(),
        calculator: faker.helpers.arrayElement(["FLT", "UNT"]),
        calculatorItems: [{
            type: faker.helpers.arrayElement(["FLT", "UNT"]),
            value: faker.number.float({min:1, max:999, fractionDigits: 3})
        }]
    }
});

// console.log(JSON.stringify(create_api_charge(), null, 2))

const insertRecords = async (dbName, collectionName, totalRecords) => {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas!");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const batchSize = 10000; 
        let records = [];

        for (let i = 0; i < totalRecords; i++) {
            records.push(create_api_charge());

            if (records.length === batchSize || i === totalRecords - 1) {
                await collection.insertMany(records);
                console.log(`${i + 1} records inserted...`);
                records = []; // Clear the batch
            }
        }

        console.log("Finished inserting all records.");
    } catch (error) {
        console.error("Error inserting records:", error);
    } finally {
        await client.close();
        console.log("Connection to MongoDB Atlas closed.");
    }
};

insertRecords(dbName, collectionName, 20000000);
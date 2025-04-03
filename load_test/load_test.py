from locust import User, task, constant, events
from pymongo import MongoClient
import sys
import json
import time
import itertools

class MongoDBUser(User):
    wait_time = constant(0)

    def on_start(self):
        """Connect to MongoDB Atlas and load queries from stdin at the start of the test."""
        # Read the MongoDB URI from Locust environment arguments
        mongodb_uri = self.environment.parsed_options.mongodb_uri

        if not mongodb_uri:
            raise ValueError("You must provide a MongoDB URI using the --mongodb-uri option.")

        self.client = MongoClient(mongodb_uri)
        self.db = self.client["rms"]
        self.collection = self.db["apiCharges"]

        # Load query data from file
        try:
            with open('sample_documents.json', 'r') as f:
                self.query_data = json.load(f)  # Read the JSON array from the file
            
            # Check if the loaded data is a list (array)
            if not isinstance(self.query_data, list):
                raise ValueError("Expected a JSON array of queries.")
                
        except Exception as e:
            raise ValueError(f"Error loading query data from file: {e}")


        # Create a cyclic iterator to execute queries in sequence
        self.query_iterator = itertools.cycle(self.query_data)

    def on_stop(self):
        """Close the MongoDB connection."""
        self.client.close()

    @task
    def query_mongodb(self):
        """Query MongoDB RMS with random values"""
        query = next(self.query_iterator)

        # Clean up the query by removing keys with None values
        query = {k: v for k, v in query.items() if v is not None}

        start_time = time.time()
        try:
            result = list(self.collection.find(query).limit(10))

            response_time = (time.time() - start_time) * 1000
            self.environment.events.request.fire(
                request_type="mongodb",
                name="query",
                response_time=response_time,
                response_length=len(result),
                exception=None,
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.environment.events.request.fire(
                request_type="mongodb",
                name="query",
                response_time=response_time,
                response_length=0,
                exception=e,
            )

# Add custom Locust command-line arguments
@events.init_command_line_parser.add_listener
def add_custom_arguments(parser):
    parser.add_argument("--mongodb-uri", type=str, help="MongoDB Atlas connection URI")

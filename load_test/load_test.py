from locust import User, task, constant, events
from pymongo import MongoClient
from faker import Faker
import random
import time

class MongoDBUser(User):
    wait_time = constant(0)

    def on_start(self):
        """Connect to MongoDB Atlas at the start of the test."""
        # Read the MongoDB URI from Locust environment arguments
        mongodb_uri = self.environment.parsed_options.mongodb_uri

        if not mongodb_uri:
            raise ValueError("You must provide a MongoDB URI using the --mongodb-uri option.")

        self.client = MongoClient(mongodb_uri)
        self.db = self.client["cars"]
        self.collection = self.db["measurements"]
        self.fake = Faker()

    def on_stop(self):
        """Close the MongoDB connection."""
        self.client.close()

    def generate_fake_measurement(self):
        return {
            "measurement_id": self.fake.uuid4(),
            "car_id": self.fake.bothify(text='car-##'),
            "customer_id": self.fake.bothify(text='cust-##'),
            "sensor_id": self.fake.bothify(text='sensor-##'),
            "measurement_time": self.fake.iso8601(),
            "measurement_type": self.fake.random_element(elements=("gps_location", "engine_telemetry", "environmental", "electrical", "tire_monitoring")),
            "measurement_data": {
                "latitude": float(self.fake.latitude()),
                "longitude": float(self.fake.longitude()),
                "altitude": float(random.uniform(100, 3000)),  # Ensure this is a float
                "speed": float(random.uniform(0, 150)),       # Ensure this is a float
                "bearing": float(random.uniform(0, 360)),     # Ensure this is a float
                "accuracy": float(random.uniform(0.0, 10.0)), # Ensure this is a float
            }
        }

    @task
    def insert_mongodb_bulk(self):
        """Bulk insert generated documents into MongoDB RMS"""
        batch_size = 400  
        documents = [self.generate_fake_measurement() for _ in range(batch_size)]

        start_time = time.time()
        try:
            result = self.collection.insert_many(documents)
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

            self.environment.events.request.fire(
                request_type="mongodb",
                name="insert",
                response_time=response_time,
                response_length=batch_size
                exception=None,
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.environment.events.request.fire(
                request_type="mongodb",
                name="bulk_insert",
                response_time=response_time,
                response_length=0,
                exception=e,
            )


# Add custom Locust command-line arguments
@events.init_command_line_parser.add_listener
def add_custom_arguments(parser):
    parser.add_argument("--mongodb-uri", type=str, help="MongoDB Atlas connection URI")

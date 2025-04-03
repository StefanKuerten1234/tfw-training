# MongoDB Load Testing with Locust
This document provides instructions on setting up a virtual environment and running a MongoDB load test using Locust.
## Prerequisites
- Python 3.7+
- MongoDB database (either local or Atlas)
- Internet connection to install the necessary Python packages
## Setup Instructions
### Step 1: Create a Virtual Environment
Create a virtual environment to manage dependencies:
```bash
python3 -m venv venv

### Step 2: Activate the Virtual Environment
Activate the virtual environment:

source venv/bin/activate

### Step 3: Install Dependencies
With the virtual environment activated, install the required Python packages:

pip install -r requirements.txt

### Step 4: Run the Locust Load Test

locust -f load_test.py --mongodb-uri "your-mongodb-uri"

Replace "your-mongodb-uri" with your actual MongoDB connection string.

#### Accessing the Locust Web Interface
http://localhost:8089

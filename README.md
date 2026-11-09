# Vertex AI Studio Frontend App with Node.js Backend

This repository contains a frontend and a Node.js backend, designed to run together.
The backend acts as a proxy, handling Google Cloud API calls.

This project is intended for demonstration and prototyping purposes only.
It is not intended for use in a production environment.


# Moisha — Your Airbnb Pocket Advisor

Moisha is an AI-powered assistant for Airbnb and short-term rental hosts. It helps with everyday hosting tasks, difficult guest situations, booking issues, and property management.

Whether you manage a single room or several rental properties, Moisha gives you practical advice, helps prepare guest messages, and makes complicated hosting situations easier to handle.

## How It Works

| Step | What You Do | What Moisha Does |
|---|---|---|
| 1. Select Property | Choose the rental property you want to analyze. | Loads its location, property details, current nightly rate, and pricing limits. |
| 2. Review Pricing | Check your current rates and available dates. | Identifies vacant nights and potential revenue at risk. |
| 3. Analyze Local Market | Select or review your property's market area. | Researches local rental prices, weekday and weekend rates, and market conditions. |
| 4. Compare Competitors | Review similar nearby properties. | Compares available competitor rates and identifies pricing gaps. |
| 5. Get Recommendations | Review Moisha's analysis. | Suggests nightly rates, pricing adjustments, and promotional strategies. |
| 6. Make a Decision | Choose whether to adjust your prices. | Calculates the potential revenue impact and respects your minimum price limit. |

**The result:** A clearer picture of your local market, a better understanding of your property's earning potential, and pricing decisions backed by available data.


*Note: Moisha provides AI-generated information and suggestions. Hosts remain responsible for verifying applicable Airbnb policies, local regulations, and decisions involving their properties.*
## Prerequisites

To run this application locally, you need:

*   **[Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)**: Follow the instructions to install the SDK.

*   **gcloud Initialization**:
    *   Initialize the gcloud CLI:
        ```bash
        gcloud init
        ```
    *   Authenticate for Application Default Credentials (needed to call Google Cloud APIs):
        ```bash
        gcloud auth application-default login
        ```

*   **Node.js and npm**: Ensure you have Node.js and its package manager, `npm`, installed on your machine.

## Project Structure

The project is organized into two main directories:

*   `frontend/`: Contains the Frontend application code.
*   `backend/`: Contains the Node.js/Express server code to proxy Google Cloud API calls.

## Backend Environment Variables

The `backend/.env.local` file is automatically generated when you download this application.
It contains essential Google Cloud environment variables pre-configured based on your project settings at the time of download.

The variables set in `backend/.env.local` are:
*   `API_BACKEND_PORT`: The port the backend API server listens on (e.g., `5000`).
*   `API_PAYLOAD_MAX_SIZE`: The maximum size of the request payload accepted by the backend server (e.g., `5mb`).
*   `GOOGLE_CLOUD_LOCATION`: The Google Cloud region associated with your project.
*   `GOOGLE_CLOUD_PROJECT`: Your Google Cloud Project ID.

**Note:** These variables are automatically populated during the download process.
You can modify the values in `backend/.env.local` if you need to change them.

## Installation and Running the App

To install dependencies and run your Google Cloud Vertex AI Studio App locally, execute the following command:

```bash
npm install && npm run dev

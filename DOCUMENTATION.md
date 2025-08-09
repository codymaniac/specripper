# SpecRipper: Intelligent Document Preparation

This document provides a comprehensive overview of the SpecRipper application, its purpose, features, and technical architecture. For instructions on how to run this application in a secure, air-gapped environment, please see **`DOCKER_DEPLOYMENT_GUIDE.md`**.

## 1. Core Purpose & Vision

SpecRipper is a powerful, interactive, and entirely browser-based tool designed to transform raw, unstructured PDF documents into highly structured, traceable, and "inference-ready" JSON data. It serves as the critical first step in any advanced document analysis pipeline, allowing a user to clean, segment, and enrich text content with rich metadata before it is passed to a Large Language Model (LLM).

The entire process runs **offline in the user's browser**, ensuring data privacy, security, and speed.

## 2. How to Use SpecRipper

The application is designed to be an intuitive, step-by-step workbench for preparing your documents.

1.  **Upload PDF**: Click "Select PDF" to choose a local PDF file. The application uses `pdfjs-dist` to parse the text directly in your browser. No data is sent to any server.
2.  **Configure Cleaning Rules**: Open the "Cleaning Rules" accordion. Here you can:
    *   Toggle standard cleaning options like removing repeating headers, footers, and page numbers.
    *   Add custom rules using regular expressions to handle document-specific formatting quirks.
    *   As you change the rules, the "Cleaned Text" tab updates in real-time, allowing you to instantly see the effect of your changes.
3.  **Configure Chunking Settings**: Open the "Chunking" accordion to:
    *   Select a target LLM (Llama3, Claude, Gemini) to set a sensible default chunk size.
    *   Fine-tune the `Max Chunk Size` and `Chunk Overlap` using the sliders. The overlap ensures context is maintained between consecutive chunks from the same section.
4.  **Generate Chunks**: Click the "Generate Chunks" button. The tool will process the cleaned text according to your settings.
5.  **Review and Audit**:
    *   The "Chunks" tab will populate with cards for each generated chunk.
    *   Inspect the content, title, and section IDs.
    *   Hover over the semantic label (e.g., `Safety`) to see a tooltip explaining *why* it was classified that way.
    *   Use the "Context Simulation" progress bar to see how much of a model's context window each chunk might use.
6.  **Download JSON**: Once you are satisfied, click "Download Chunks" to save a single, well-structured JSON file containing all the chunks and their rich metadata, ready for your downstream scripts.

## 3. How to Run for Development (on your own PC)

To run this application on your own development computer, follow these steps:

1.  **Download the Project**: Download the entire project folder to your local machine.
2.  **Install Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/). This will also install `npm`, the Node.js package manager.
3.  **Open a Terminal**: Navigate to the root directory of the project folder in your terminal or command prompt.
4.  **Install Dependencies**: Run the following command to install all the necessary packages for the project.
    ```bash
    npm install
    ```
5.  **Run the Application**: Once the installation is complete, start the development server with this command:
    ```bash
    npm run dev
    ```
6.  **View in Browser**: Open your web browser and go to the following address: [http://localhost:9002](http://localhost:9002)

## 4. Key Strengths & Features

SpecRipper excels in several key areas, making it a best-in-class tool for its purpose.

### a. Deep Traceability & Rich Metadata

This is the tool's greatest strength. Every chunk is not just a block of text; it's an enriched data object with unparalleled traceability. The metadata for each chunk includes:

-   `chunk_id`: A unique identifier for each chunk.
-   `title`: The specific, human-readable section heading (e.g., "1.1 Scope of this Publication").
-   `section`: The full, raw section header text.
-   `section_id`: The hierarchical ID from the document (e.g., "2.1.4").
-   `parent_id`: Links continuation chunks back to the first chunk of their section, preserving structural context.
-   `related_chunks`: Identifies adjacent chunks for contextual linking.
-   `resolved_glossary_terms`: A map of acronyms/terms found in the chunk to their full definitions, providing the LLM with immediate, in-context knowledge.
-   `semantic_label`: A rule-based classification (e.g., "Safety", "Functional Requirement").
-   `semantic_label_reason`: An explanation for why a specific semantic label was assigned (e.g., `"Detected based on keyword: 'shall'"`).

### b. Intelligent, Structure-Aware Processing

-   **Section-Aware Chunking**: The tool's primary chunking strategy is based on the document's inherent semantic structure (headings and subheadings), not just arbitrary token counts.
-   **Rule-Based Semantic Intelligence**: Through clever, offline techniques, the tool achieves a level of semantic understanding:
    -   **Glossary Resolver**: Automatically detects and parses glossary/acronym sections and injects definitions directly into the metadata of relevant chunks.
    -   **Keyword-Based Classifier**: Assigns meaningful semantic labels to chunks, providing a first layer of content understanding.

### c. Interactive Workbench for Rule Development

The entire UI is designed as a powerful debugging and configuration tool. The real-time feedback loop between editing cleaning rules and viewing the cleaned text allows for rapid development of a perfect processing "recipe" for a specific document type.

## 5. Technical Architecture

-   **Framework**: Next.js with React
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS with ShadCN UI components
-   **PDF Parsing**: `pdfjs-dist`, running entirely on the client-side.
-   **Deployment**: Packaged with Docker for portability.
-   **Environment**: 100% in-browser, offline-first. This guarantees data privacy and makes the tool fast and portable.

## 6. Role in a Production Pipeline

SpecRipper is the definitive **"R&D Lab" and "Configuration Tool"** for a larger, automated pipeline.

1.  **Develop the Recipe**: Use this interactive tool to upload a representative document, experiment with cleaning and chunking settings, and visually verify the quality of the output.
2.  **Export the Configuration**: The ideal settings (custom regex rules, chunk size, overlap) and the structure of the resulting JSON become a proven "recipe" for that document type.
3.  **Scale with Automation**: Feed this recipe and the structured JSON into a downstream, server-based script (e.g., a Python script for a Level 4 pipeline) for LLM inference, validation, and final report generation. See **`PYTHON_PIPELINE_GUIDE.md`** for an example.

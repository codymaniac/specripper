# **App Name**: DocuChunk

## Core Features:

- PDF Upload & Storage: Upload and store PDF documents locally using the browser's storage capabilities for offline access.
- Noise Removal: Remove headers, footers, and page numbers from uploaded PDF documents based on configurable patterns.
- Pattern Cleansing: Apply company-specific cleansing rules to normalize terminology within the documents, specified via regular expressions or a dictionary.
- Intelligent Chunking: Intelligently chunk documents using a hybrid hierarchical-semantic strategy that respects section boundaries and semantic density.
- Model-Aware Chunking: Adjust chunk sizes dynamically, using an LLM 'tool', to optimize for different model context windows (e.g., Llama3, Claude).
- Visualization and Adjustment: Visually preview the uploaded PDF and the generated chunks, with options to adjust cleaning rules and chunking parameters.
- LLM Context Simulator: Simulate the context window utilization for different LLMs to fine-tune chunking and cleaning configurations.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), evoking trust and reliability suitable for document processing.
- Background color: Very light blue (#E8EAF6), offering a calm and focused backdrop for content.
- Accent color: Purple (#9C27B0), used sparingly to draw attention to interactive elements and key information.
- Body text: 'Inter', a sans-serif font that ensures a clean, modern, and easily readable user experience.
- Headline Font: 'Space Grotesk', for a techy and scientific feel
- Crisp, modern icons that clearly represent actions such as upload, clean, chunk, and download.
- Clean, structured layout that balances preview and editing tools
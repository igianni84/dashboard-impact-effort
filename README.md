# Wine Features Impact/Effort Analysis Dashboard

An interactive web application for visualizing feature prioritization data from wine industry stakeholders.

## Overview

This dashboard displays wine features across macro areas (Discovery & Education, Personalization & Advisory, Wine Investment & Financial Tools) evaluated by multiple stakeholders for impact, effort, and selection preferences.

## Features

- **Interactive Matrix View**: Scatter plot visualization with quadrant-based prioritization
- **Table View**: Sortable feature ranking with calculated priority scores
- **Dynamic Filtering**: Filter by stakeholder or macro area
- **Configurable Scoring**: Adjust Impact/Effort/Preference weights in real-time
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

1. Clone the repository
2. Start a local web server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open http://localhost:8000 in your browser

## Project Structure

```
Dashboard/
├── index.html          # Main dashboard interface
├── script.js           # Core application logic
├── styles.css          # Styling and themes
├── output.json         # Feature evaluation data
├── CLAUDE.md           # Development guidelines
└── README.md           # This file
```

## Data Format

Features are evaluated by stakeholders (Valentina, Giovanni, Chiara, Paolo, Alessandro, Stefania) with:
- Impact rating (1-5 scale)
- Effort rating (1-5 scale)
- Selection preference (boolean)
- Macro area categorization

## Technology

- Pure vanilla JavaScript (no build process required)
- Chart.js for visualizations
- Responsive CSS Grid layout
- Static file serving

## License

This project is for educational/demonstration purposes.
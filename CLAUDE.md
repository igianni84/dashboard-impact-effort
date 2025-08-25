# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a wine features Impact/Effort Analysis Dashboard - an interactive web application that visualizes feature prioritization data from wine industry stakeholders. The dashboard displays features across macro areas like Discovery & Education, Personalization & Advisory, and Wine Investment & Financial Tools.

## Architecture

The project is a **pure client-side web application** consisting of:

- **index.html**: Main dashboard interface with sidebar controls and visualization areas
- **script.js**: Single JavaScript class `ImpactEffortDashboard` handling all functionality
- **styles.css**: Complete styling with responsive design and theme-based quadrant colors
- **output.json**: Data source containing feature evaluations from multiple stakeholders

### Key Components

#### Data Structure
Features are evaluated by multiple people (Valentina, Giovanni, Chiara, Paolo, Alessandro, Stefania) across:
- Impact rating (1-5 scale)
- Effort rating (1-5 scale) 
- Selection preference (boolean)
- Macro area categorization

#### Visualization Modes
1. **Matrix View**: Interactive scatter plot using Chart.js showing Impact vs Effort with quadrant-based coloring
2. **Table View**: Sortable feature ranking with calculated priority scores

#### Scoring Algorithm
Features receive calculated scores based on configurable weights:
- Impact weight (default: 40%)
- Effort weight (default: 30%) - applied as penalty
- Preference weight (default: 30%) - based on selection rate

## Development Commands

This is a **static web application** with no build process, package management, or testing framework.

### Running Locally
```bash
# Start a local web server (any method works)
python3 -m http.server 8000
# or
python -m SimpleHTTPServer 8000
# or use any other static server

# Then open http://localhost:8000
```

### Data Updates
```bash
# To regenerate output.json from CSV files (requires parent directory access)
cd ../
python3 csv_to_json_converter.py --all --output Dashboard/output.json
```

## Data Flow

1. **CSV Source**: Individual CSV files per person (../Valentina.csv, ../Giovanni.csv, etc.)
2. **JSON Conversion**: Parent directory contains converter script that aggregates all CSV data
3. **Dashboard Consumption**: `script.js` loads `output.json` and processes features for visualization
4. **Real-time Filtering**: Users can filter by people, macro areas, and adjust scoring weights

## Key Features

- **Dynamic Filtering**: Filter by stakeholder or macro area
- **Configurable Scoring**: Adjust Impact/Effort/Preference weights with real-time recalculation
- **Interactive Matrix**: Click points for details, quadrant-based color coding
- **Responsive Design**: Works on desktop and mobile
- **No Dependencies**: Pure vanilla JavaScript except Chart.js CDN

## File Dependencies

- **Chart.js**: Loaded via CDN for scatter plot visualization
- **output.json**: Must be present and properly formatted
- All files must be served from same origin (no file:// protocol)
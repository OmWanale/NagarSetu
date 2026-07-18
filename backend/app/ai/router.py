def route_department(category: str) -> dict:
    """
    Deteriministic Rule Engine mapping classified category 
    to a specific department and field officer.
    """
    routing_map = {
        "Sanitation": {
            "department": "Health and Sanitation Commission",
            "officer": "Dr. A. Sharma (Chief Sanitation Officer)",
            "base_eta": "12 Hours"
        },
        "Water Supply": {
            "department": "Water Supply & Sewerage Board",
            "officer": "K. Ramesh (Water Inspector)",
            "base_eta": "24 Hours"
        },
        "Roads/Potholes": {
            "department": "Public Works Department",
            "officer": "S. Murthy (PWD Inspector)",
            "base_eta": "48 Hours"
        },
        "Electricity": {
            "department": "Electricity Distribution Board",
            "officer": "V. Prasad (Lineman Overseer)",
            "base_eta": "18 Hours"
        },
        "Public Health": {
            "department": "Health and Sanitation Commission",
            "officer": "Dr. A. Sharma (Chief Sanitation Officer)",
            "base_eta": "24 Hours"
        },
        "Waste Management": {
            "department": "Health and Sanitation Commission",
            "officer": "Dr. A. Sharma (Chief Sanitation Officer)",
            "base_eta": "24 Hours"
        }
    }

    # Safe fallback if category is unrecognized
    return routing_map.get(category, {
        "department": "Public Works Department",
        "officer": "S. Murthy (PWD Inspector)",
        "base_eta": "36 Hours"
    })

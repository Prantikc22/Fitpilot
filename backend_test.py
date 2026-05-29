"""Backend API tests for Leanly"""
import requests
import json
import sys
from typing import Dict, Any

# Use the backend URL from environment
BACKEND_URL = "https://code-pull-deploy.preview.emergentagent.com/api"

def test_meal_plan_generate():
    """Test the meal plan generation endpoint"""
    print("\n" + "="*80)
    print("Testing POST /api/meal-plan/generate")
    print("="*80)
    
    # Test payload as specified in the review request
    payload = {
        "profile": {
            "current_weight_kg": 80,
            "goal_weight_kg": 70,
            "diet_pref": "omnivore",
            "cuisine": "mixed",
            "allergies": [],
            "budget_monthly": 5000,
            "daily_calorie_target": 1800,
            "daily_protein_target": 120
        },
        "yesterday_calories": 1900
    }
    
    print(f"\nRequest URL: {BACKEND_URL}/meal-plan/generate")
    print(f"Request Payload:\n{json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/meal-plan/generate",
            json=payload,
            timeout=90
        )
        
        print(f"\nResponse Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected status 200, got {response.status_code}")
            print(f"Response Text: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"\nResponse Data:\n{json.dumps(data, indent=2)}")
        
        # Verify response structure
        required_meals = ["breakfast", "lunch", "dinner", "snack"]
        required_meal_fields = ["name", "calories", "protein", "items", "prep_time"]
        required_top_level = ["total_calories", "total_protein", "tip"]
        
        errors = []
        
        # Check each meal exists and has required fields
        for meal in required_meals:
            if meal not in data:
                errors.append(f"Missing meal: {meal}")
            else:
                meal_data = data[meal]
                for field in required_meal_fields:
                    if field not in meal_data:
                        errors.append(f"Missing field '{field}' in {meal}")
                    elif field == "items" and not isinstance(meal_data[field], list):
                        errors.append(f"Field 'items' in {meal} should be an array")
        
        # Check top-level fields
        for field in required_top_level:
            if field not in data:
                errors.append(f"Missing top-level field: {field}")
        
        if errors:
            print("\n❌ FAILED: Response structure validation errors:")
            for error in errors:
                print(f"  - {error}")
            return False
        
        print("\n✅ PASSED: All required fields present")
        print(f"  - Meals: {', '.join(required_meals)}")
        print(f"  - Total Calories: {data.get('total_calories')}")
        print(f"  - Total Protein: {data.get('total_protein')}")
        print(f"  - Tip: {data.get('tip')[:50]}...")
        
        return True
        
    except requests.exceptions.Timeout:
        print("❌ FAILED: Request timed out after 90 seconds")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"❌ FAILED: Connection error - {str(e)}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAILED: Invalid JSON response - {str(e)}")
        print(f"Response text: {response.text[:500]}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error - {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("LEANLY BACKEND API TESTS")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    
    results = {}
    
    # Test meal plan generation
    results["meal_plan_generate"] = test_meal_plan_generate()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()

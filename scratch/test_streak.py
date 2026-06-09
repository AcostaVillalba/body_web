import datetime
from datetime import date, timedelta

def calculate_streak_test(today_date, scheduled_weekdays, completed_dates):
    current_date = today_date
    streak = 0
    active = True
    max_lookback = 100
    lookback_days = 0
    used_completion_dates = set()
    
    while active and lookback_days < max_lookback:
        weekday = current_date.weekday()
        date_str = current_date.strftime("%Y-%m-%d")
        next_day = current_date + timedelta(days=1)
        next_day_str = next_day.strftime("%Y-%m-%d")
        
        if weekday in scheduled_weekdays:
            date_str_available = date_str in completed_dates and date_str not in used_completion_dates
            next_day_str_available = next_day_str in completed_dates and next_day_str not in used_completion_dates
            
            if date_str_available:
                streak += 1
                used_completion_dates.add(date_str)
            elif next_day_str_available:
                streak += 1
                used_completion_dates.add(next_day_str)
            else:
                if current_date == today_date:
                    pass
                else:
                    active = False
        else:
            pass
            
        current_date -= timedelta(days=1)
        lookback_days += 1
        
    return streak

# Runs test scenarios
def run_tests():
    # Weekday numbers: Tue=1, Thu=3, Sat=5
    scheduled = [1, 3, 5]
    
    # Let's say today is Tuesday, 2026-05-26
    today = date(2026, 5, 26)
    
    # Scenario A: Today is Tuesday, completed today.
    # Expected: 1
    completed = {"2026-05-26"}
    res = calculate_streak_test(today, scheduled, completed)
    assert res == 1, f"Scenario A failed: got {res}"
    
    # Scenario B: Today is Tuesday. Today is NOT completed. Saturday was completed.
    # Expected: 1 (Since Tuesday is not over yet, it doesn't break the streak)
    completed = {"2026-05-23"}
    res = calculate_streak_test(today, scheduled, completed)
    assert res == 1, f"Scenario B failed: got {res}"
    
    # Scenario C: Today is Wednesday, 2026-05-27 (rest day). Tuesday was completed.
    # Expected: 1
    completed = {"2026-05-26"}
    res = calculate_streak_test(date(2026, 5, 27), scheduled, completed)
    assert res == 1, f"Scenario C failed: got {res}"
    
    # Scenario D: Today is Wednesday, 2026-05-27. Tuesday was NOT completed.
    # Expected: 0 (Since Tuesday is in the past and was missed)
    completed = set()
    res = calculate_streak_test(date(2026, 5, 27), scheduled, completed)
    assert res == 0, f"Scenario D failed: got {res}"
    
    # Scenario E: Today is Tuesday (completed). Saturday (completed). Thursday (completed).
    # Expected: 3
    completed = {"2026-05-26", "2026-05-23", "2026-05-21"}
    res = calculate_streak_test(today, scheduled, completed)
    assert res == 3, f"Scenario E failed: got {res}"
    
    # Scenario F: Today is Wednesday (2026-05-27). Tuesday was completed on Wednesday (+1 flexibility).
    # Expected: 1
    completed = {"2026-05-27"}
    res = calculate_streak_test(date(2026, 5, 27), scheduled, completed)
    assert res == 1, f"Scenario F failed: got {res}"
    
    # Scenario G: Today is Friday. Thursday completed on Thursday. Tuesday completed on Tuesday. Saturday missed.
    # Expected: 2
    completed = {"2026-05-21", "2026-05-19"}
    res = calculate_streak_test(date(2026, 5, 22), scheduled, completed)
    assert res == 2, f"Scenario G failed: got {res}"
    
    print("All tests passed successfully!")

if __name__ == "__main__":
    run_tests()

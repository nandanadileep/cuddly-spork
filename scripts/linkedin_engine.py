import sys
import os
import json
import time
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def scrape_as_guest(driver, url):
    """
    Scrapes a public profile using Selenium to bypass 999 blocks.
    """
    driver.get(url)
    
    # Random delay to mimic human behavior
    time.sleep(random.uniform(3.5, 6.0))
    
    output = {
        "name": "Member",
        "headline": "",
        "about": "",
        "location": "",
        "education": [],
        "experience": [],
        "is_guest": True
    }
    
    try:
        # Wait for name (h1 is usually the name)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
        
        name_selectors = [
            (By.TAG_NAME, "h1"),
            (By.CLASS_NAME, "top-card-layout__title"),
            (By.CSS_SELECTOR, "h1.top-card-layout__title")
        ]
        for by, selector in name_selectors:
            try:
                val = driver.find_element(by, selector).text.strip()
                if val and val != "LinkedIn": 
                    output["name"] = val
                    break
            except: continue

        headline_selectors = [
            (By.CLASS_NAME, "top-card-layout__headline"),
            (By.CSS_SELECTOR, "h2.top-card-layout__headline")
        ]
        for by, selector in headline_selectors:
            try:
                val = driver.find_element(by, selector).text.strip()
                if val:
                    output["headline"] = val
                    break
            except: continue

        about_selectors = [
            (By.CLASS_NAME, "core-section-container__content"),
            (By.CLASS_NAME, "summary__text")
        ]
        for by, selector in about_selectors:
            try:
                val = driver.find_element(by, selector).text.strip()
                if val:
                    output["about"] = val
                    break
            except: continue
            
    except Exception as e:
        # If we hit an auth wall, this will catch it
        if "authwall" in driver.current_url:
            return {"error": "LinkedIn is requiring a login to view this profile. Please provide credentials in .env.local for full access."}
        pass
        
    return output

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
    
    url = sys.argv[1]
    email = os.environ.get("LINKEDIN_EMAIL")
    password = os.environ.get("LINKEDIN_PASSWORD")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new") # Stealthier headless mode
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    # Realistic User Agent
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Additional stealth to remove "navigator.webdriver" flag
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        })

        if email and password:
            # Login if credentials provided
            driver.get("https://www.linkedin.com/login")
            time.sleep(2)
            driver.find_element(By.ID, "username").send_keys(email)
            driver.find_element(By.ID, "password").send_keys(password)
            driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
            time.sleep(random.uniform(3, 5))
            
            # Now go to profile
            driver.get(url)
            time.sleep(random.uniform(4, 6))
            
            # Simple extraction for authenticated
            try:
                name = driver.find_element(By.TAG_NAME, "h1").text.strip()
                headline = driver.find_element(By.XPATH, "//div[contains(@class, 'text-body-medium')]").text.strip()
                output = {
                    "name": name,
                    "headline": headline,
                    "education": [], # Full library logic could be added here later if needed
                    "experience": [],
                    "is_guest": False
                }
            except:
                output = scrape_as_guest(driver, url) # Fallback to guest selectors
        else:
            # Guest scrape
            output = scrape_as_guest(driver, url)
            
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        try: driver.quit()
        except: pass

if __name__ == "__main__":
    main()

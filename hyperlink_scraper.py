import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def get_all_links(url):
    """
    Extract all hyperlinks from a given URL
    Args:
        url (str): The URL to scrape links from
    Returns:
        list: List of all unique links found on the page
    """
    if not urlparse(url).scheme:
        url = 'https://' + url
    
    try:
        # Send a GET request to the URL
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        
        # Parse the HTML content
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all anchor tags and extract their href attributes
        links = []
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            
            absolute_url = urljoin(url, href)
            links.append(absolute_url)
        
        return list(set(links))
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching the URL: {e}")
        return []

def main():
    """
    Main function to run the program with a variable URL
    """
    # URL to scrape - change this to your target website
    url = "https://en.wikipedia.org/wiki/Computer_Science_Undergraduate_Association"
    
    # Optional output file - set to None if you don't want to save to a file
    output_file = None
    
    print(f"Scraping links from: {url}")
    links = get_all_links(url)
    
    # Print all links to console
    print(f"Found {len(links)} unique links:")
    for i, link in enumerate(links, 1):
        print(f"{i}. {link}")
    
    # Save links to file if output_file is specified
    if output_file:
        with open(output_file, 'w') as f:
            for link in links:
                f.write(f"{link}\n")
        print(f"Links saved to {output_file}")

if __name__ == "__main__":
    main()
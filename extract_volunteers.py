from bs4 import BeautifulSoup
import os
import shutil

# Make a backup
shutil.copy('Volunteers.html', 'Volunteers.html.bak')

with open('Volunteers.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

# Find all divs with class "page"
pages = soup.find_all('div', class_='page')

first_page = True
content_container = soup.new_tag("div", id="content-container")

for page in pages:
    page_id = page.get('id')
    if page_id:
        new_page_id = f"volunteers_{page_id}"
        
        # We need to change any onclick="showPage('home')" inside this page to onclick="showPage('volunteers_home')" etc.
        # Actually, let's just do a string replace on the HTML string of this page.
        inner_html = "".join([str(child) for child in page.children])
        inner_html = inner_html.replace("showPage('home')", "showPage('volunteers_home')")
        inner_html = inner_html.replace("showPage('FAQs')", "showPage('volunteers_FAQs')")
        inner_html = inner_html.replace("showPage('Support')", "showPage('volunteers_Support')")
        
        with open(f'pages/{new_page_id}.html', 'w', encoding='utf-8') as f:
            f.write(inner_html)
            
    if first_page:
        page.insert_before(content_container)
        first_page = False
    page.extract()

# Convert soup back to string
modified_html = str(soup)
# Also fix the links in the nav bar of Volunteers.html shell
modified_html = modified_html.replace("showPage('home')", "showPage('volunteers_home')")
modified_html = modified_html.replace("showPage('FAQs')", "showPage('volunteers_FAQs')")
modified_html = modified_html.replace("showPage('Support')", "showPage('volunteers_Support')")

with open('Volunteers.html', 'w', encoding='utf-8') as f:
    f.write(modified_html)

print("Volunteers extraction complete!")

from bs4 import BeautifulSoup, Comment
import os
import shutil

# Make a backup
shutil.copy('index.html', 'index.html.bak')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

if not os.path.exists('pages'):
    os.makedirs('pages')

# Find all divs with class "page"
pages = soup.find_all('div', class_='page')

for page in pages:
    page_id = page.get('id')
    if page_id:
        # Save the contents of the page to pages/{page_id}.html
        # We'll save the innerHTML so that the outer wrapper is dynamically applied or we can just save the whole div.
        # Let's save the whole div to ensure any specific classes on it are preserved.
        # Actually, if we are fetching, it's easier to inject the inner HTML into a `<div id="content"></div>`.
        # Wait, the current JS does `document.getElementById(pageId)`. If we inject, we might want to just inject the innerHTML.
        # Let's save the inner HTML.
        inner_html = "".join([str(child) for child in page.children])
        with open(f'pages/{page_id}.html', 'w', encoding='utf-8') as f:
            f.write(inner_html)

# Now, we need to replace all those pages in the original HTML with a single container.
# We'll remove all `.page` divs.
first_page = True
content_container = soup.new_tag("div", id="content-container")

for page in pages:
    if first_page:
        page.insert_before(content_container)
        first_page = False
    page.extract()

# Also, there are comments like `<!-- ====================================================== ...` which we might want to clean up if they were before the pages, but leaving them is fine.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(str(soup))

print("Extraction complete!")

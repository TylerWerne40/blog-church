# -*- coding: utf-8 -*-
"""File conversion handler for article uploads."""
import os
import tempfile
from urllib import request
from werkzeug.utils import secure_filename
import pypandoc
import pdfplumber
from bs4 import BeautifulSoup
import bleach

# Define what your Editor is allowed to keep
allowed_tags = ['p', 'b', 'i', 'u', 'em', 'strong', 'a', 'img', 'div', 'span', 'h1', 'h2', 'h3']
allowed_attrs = {
    '*': ['class', 'style'], # Allow CSS overrides via class/style on all tags
    'a': ['href', 'rel'],
    'img': ['src', 'alt', 'width', 'height']
}

ALLOWED_EXTENSIONS = {'pdf', 'docx'}


def apply_bootstrap_classes(html_content):
    """
    Apply Bootstrap classes to HTML content for better integration.
    
    Args:
        html_content: Raw HTML string
    
    Returns:
        HTML string with Bootstrap classes added
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Wrap everything in a container
    container = soup.new_tag('div', **{'class': 'container my-4'})
    if soup.body:
        for child in list(soup.body.children):
            container.append(child)
        soup.body.clear()
        soup.body.append(container)
    else:
        # If no body, wrap the content
        for child in list(soup.children):
            if child.name:
                container.append(child)
        soup.clear()
        soup.append(container)
    
    # Add classes to paragraphs
    for p in soup.find_all('p'):
        p['class'] = p.get('class', []) + ['mb-3']
    
    # Add classes to headings
    for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        h['class'] = h.get('class', []) + ['mb-3']
    
    # Add classes to lists
    for ul in soup.find_all('ul'):
        ul['class'] = ul.get('class', []) + ['mb-3']
    for ol in soup.find_all('ol'):
        ol['class'] = ol.get('class', []) + ['mb-3']
    
    # Add classes to list items if needed
    for li in soup.find_all('li'):
        li['class'] = li.get('class', []) + ['mb-1']
    
    return str(soup)


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def convert_to_html(file_path, file_type):
    """
    Convert PDF or DOCX file to HTML.
    
    Args:
        file_path: Path to the file to convert
        file_type: Type of file ('pdf' or 'docx')
    
    Returns:
        HTML content as string or None if conversion failed
    """
    try:
        if file_type.lower() == 'docx':
            return convert_docx_to_html(file_path)
        elif file_type.lower() == 'pdf':
            return convert_pdf_to_html(file_path)
        else:
            return None
    except Exception as e:
        print(f"Conversion error: {str(e)}")
        return None


def convert_docx_to_html(file_path):
    """Convert DOCX file to HTML using pypandoc."""
    # TODO: Make sure Pandoc is installed and available in the environment. Issue for deployment.
    try:
        # pandoc_path = pypandoc.download_pandoc() 
        # if not pandoc_path:
        #     raise Exception("Failed to download Pandoc")
            
        # # download_pandoc returns (path_to_dir, filename)
        # install_path, _ = pandoc_path
        # pandoc_exe = os.path.join(install_path, 'pandoc.exe')
        
        # # Set the path explicitly
        # pypandoc.set_pandoc_path(pandoc_exe)
        html = clean_html(pypandoc.convert_file(file_path, 'html', format='docx'))
        # Apply Bootstrap classes
        html = apply_bootstrap_classes(html)
        return html
    except Exception as e:
        print(f"DOCX conversion error: {str(e)}")
        return None

def convert_pdf_to_html(file_path):
    """Convert PDF file to HTML."""
    try:
        html_content = '<div class="container my-4 pdf-content">'
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text
                text = page.extract_text()
                html_content += f'<div class="pdf-page mb-4" data-page="{page_num}">\n'
                # Split text into paragraphs
                paragraphs = text.split('\n\n')
                for para in paragraphs:
                    if para.strip():
                        html_content += f'<p class="mb-3">{para.strip()}</p>\n'
                html_content += '</div>\n'
        
        html_content += '</div>'
        return apply_bootstrap_classes(clean_html(html_content))
    except Exception as e:
        print(f"PDF conversion error: {str(e)}")
        return None

def clean_html(html_content):
    """
    Clean HTML content to remove unwanted tags and attributes.
    
    Args:
        html_content: Raw HTML string
    """
    return bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attrs)

def save_uploaded_file(file):
    """
    Save uploaded file temporarily and return path.
    
    Args:
        file: Flask FileStorage object
    
    Returns:
        Path to saved file or None if save failed
    """
    try:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            return file_path
        return None
    except Exception as e:
        print(f"File save error: {str(e)}")
        return None

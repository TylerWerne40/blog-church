# -*- coding: utf-8 -*-
"""File conversion handler for article uploads."""
import os
import tempfile
from werkzeug.utils import secure_filename
import pypandoc
import pdfplumber

ALLOWED_EXTENSIONS = {'pdf', 'docx'}


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
    try:
        html = pypandoc.convert_file(file_path, 'html', format='docx')
        return html
    except Exception as e:
        print(f"DOCX conversion error: {str(e)}")
        return None


def convert_pdf_to_html(file_path):
    """Convert PDF file to HTML."""
    try:
        html_content = '<div class="pdf-content">'
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text
                text = page.extract_text()
                html_content += f'<div class="pdf-page" data-page="{page_num}">\n'
                html_content += f'<p>{text}</p>\n'
                html_content += '</div>\n'
        
        html_content += '</div>'
        return html_content
    except Exception as e:
        print(f"PDF conversion error: {str(e)}")
        return None


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

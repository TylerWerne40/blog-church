// Simple hash function to generate a short hash from a string
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and take last 8 characters
    return Math.abs(hash).toString(36).substring(0, 8);
}

// Auto-generate tag from title
function slugify(text) {
    const originalText = text.toLowerCase().trim();
    
    // Clean the text: remove special characters, keep spaces
    let cleaned = originalText.replace(/[^\w\s-]/g, '');
    
    // Take first 40 characters
    let slug = cleaned.substring(0, 40);
    
    // Replace spaces with hyphens and clean up
    slug = slug.replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    
    // Generate hash from original title
    const hash = simpleHash(originalText);
    
    // Combine slug with hash, ensuring total length <= 80
    const combined = slug ? `${slug}-${hash}` : hash;
    
    // Ensure it doesn't exceed 80 characters
    if (combined.length > 80) {
        return combined.substring(0, 80);
    }
    
    return combined;
}

// Function to prettify HTML with newlines and indentation
function prettifyHTML(html) {
    let formatted = '';
    let indent = 0;
    const indentStr = '  '; // 2 spaces
    
    html.split(/(<[^>]+>)/g).forEach(token => {
        if (token.match(/^<\//)) {
            // Closing tag
            indent--;
            formatted += indentStr.repeat(Math.max(0, indent)) + token + '\n';
        } else if (token.match(/^</) && !token.match(/\/$/)) {
            // Opening tag
            formatted += indentStr.repeat(indent) + token + '\n';
            if (!token.match(/^<(br|hr|img|input|meta|link)/i)) {
                indent++;
            }
        } else if (token.trim()) {
            // Text content
            formatted += indentStr.repeat(indent) + token.trim() + '\n';
        }
    });
    
    return formatted;
}

// Initialize once DOM is ready
function initializeArticleCompose() {
    const titleInput = document.getElementById('articleTitle');
    const tagInput = document.getElementById('articleTag');
    const tagStatus = document.getElementById('tagStatus');
    const tagFeedback = document.getElementById('tagFeedback');
    const articleForm = document.getElementById('articleForm');
    
    console.log('Initializing article compose...', { titleInput, tagInput, tagStatus, tagFeedback, articleForm });
    
    if (!titleInput || !tagInput) {
        console.error('Article compose elements not found', { titleInput, tagInput });
        return;
    }
    
    let tagCheckTimeout;

    // Generate tag from title on input - updates in real time
    titleInput.addEventListener('input', function() {
        console.log('Title input changed:', this.value);
        const slug = slugify(this.value);
        console.log('Generated slug:', slug);
        tagInput.value = slug;
        
        // Debounce tag availability check
        clearTimeout(tagCheckTimeout);
        if (slug) {
            tagCheckTimeout = setTimeout(() => {
                checkTagAvailability(slug);
            }, 300);
        } else {
            resetTagStatus();
        }
    });

    // Check tag availability on manual edit
    tagInput.addEventListener('input', function() {
        console.log('Tag input changed:', this.value);
        clearTimeout(tagCheckTimeout);
        if (this.value) {
            tagCheckTimeout = setTimeout(() => {
                checkTagAvailability(this.value);
            }, 300); // Debounce 300ms
        } else {
            resetTagStatus();
        }
    });

    function checkTagAvailability(tag) {
        fetch('/users/check-tag/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tag: tag })
        })
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                tagStatus.innerHTML = '✓';
                tagStatus.style.color = '#28a745';
                tagFeedback.innerHTML = '<span style="color: #28a745;">Tag is available</span>';
                tagInput.classList.remove('is-invalid');
                tagInput.classList.add('is-valid');
            } else {
                tagStatus.innerHTML = '✗';
                tagStatus.style.color = '#dc3545';
                tagFeedback.innerHTML = '<span style="color: #dc3545;">This tag already exists. Please choose a different one.</span>';
                tagInput.classList.remove('is-valid');
                tagInput.classList.add('is-invalid');
            }
        })
        .catch(error => {
            console.error('Error checking tag:', error);
            resetTagStatus();
        });
    }

    function resetTagStatus() {
        tagStatus.innerHTML = '';
        tagFeedback.innerHTML = '';
        tagInput.classList.remove('is-valid', 'is-invalid');
    }

    // Validate form before submission
    if (articleForm) {
        articleForm.addEventListener('submit', function(e) {
            if (tagInput.classList.contains('is-invalid')) {
                e.preventDefault();
                alert('Please choose an available tag for your article.');
                return false;
            }
            // Populate hidden content input with contentEditable innerHTML
            const contentInput = document.getElementById('contentInput');
            if (contentInput) {
                contentInput.value = articleContent.innerHTML;
            }
        });
    }

    // Content view tabs (Normal vs HTML)
    const normalViewTab = document.getElementById('normal-view-tab');
    const htmlViewTab = document.getElementById('html-view-tab');
    const normalViewContainer = document.getElementById('normalViewContainer');
    const articleContent = document.getElementById('articleContent');
    const htmlContentView = document.getElementById('htmlContentView');
    
    if (normalViewTab && htmlViewTab && articleContent && htmlContentView) {
        normalViewTab.addEventListener('click', function() {
            // Switch to normal view
            normalViewTab.classList.add('active');
            htmlViewTab.classList.remove('active');
            normalViewContainer.style.display = 'block';
            htmlContentView.style.display = 'none';
            normalViewTab.style.borderBottom = 'none';
            htmlViewTab.style.borderBottom = '1px solid #dee2e6';
            articleContent.focus();
        });

        htmlViewTab.addEventListener('click', function() {
            // Switch to HTML view
            normalViewTab.classList.remove('active');
            htmlViewTab.classList.add('active');
            normalViewContainer.style.display = 'none';
            htmlContentView.style.display = 'block';
            normalViewTab.style.borderBottom = '1px solid #dee2e6';
            htmlViewTab.style.borderBottom = 'none';
            htmlContentView.focus();
        });

        // Sync content between both editors
        articleContent.addEventListener('input', function() {
            htmlContentView.value = this.innerHTML;
        });

        htmlContentView.addEventListener('input', function() {
            articleContent.innerHTML = this.value;
        });
    }

    // Formatting toolbar buttons
    const btnBold = document.getElementById('btnBold');
    const btnItalic = document.getElementById('btnItalic');
    const btnUnderline = document.getElementById('btnUnderline');
    const btnStrikethrough = document.getElementById('btnStrikethrough');
    const btnHighlight = document.getElementById('btnHighlight');
    const btnLink = document.getElementById('btnLink');

    // Heading dropdown
    const headingDropdownItems = document.querySelectorAll('[data-heading]');
    headingDropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const heading = this.getAttribute('data-heading');
            document.execCommand('formatBlock', false, `<${heading}>`);
            articleContent.focus();
            htmlContentView.value = articleContent.innerHTML;
        });
    });

    function wrapSelection(tag, attributes = '') {
        const selection = window.getSelection();
        if (selection.toString().length === 0) {
            alert('Please select text to format');
            return;
        }

        const range = selection.getRangeAt(0);
        const span = document.createElement(tag);
        if (attributes) {
            span.setAttribute('style', attributes);
        }
        range.surroundContents(span);
        articleContent.focus();
        htmlContentView.value = articleContent.innerHTML;
    }

    if (btnBold) {
        btnBold.addEventListener('click', function(e) {
            e.preventDefault();
            document.execCommand('bold', false, null);
            articleContent.focus();
            htmlContentView.value = articleContent.innerHTML;
        });
    }

    if (btnItalic) {
        btnItalic.addEventListener('click', function(e) {
            e.preventDefault();
            document.execCommand('italic', false, null);
            articleContent.focus();
            htmlContentView.value = articleContent.innerHTML;
        });
    }

    if (btnUnderline) {
        btnUnderline.addEventListener('click', function(e) {
            e.preventDefault();
            document.execCommand('underline', false, null);
            articleContent.focus();
            htmlContentView.value = articleContent.innerHTML;
        });
    }

    if (btnStrikethrough) {
        btnStrikethrough.addEventListener('click', function(e) {
            e.preventDefault();
            document.execCommand('strikethrough', false, null);
            articleContent.focus();
            htmlContentView.value = articleContent.innerHTML;
        });
    }

    if (btnHighlight) {
        btnHighlight.addEventListener('click', function(e) {
            e.preventDefault();
            wrapSelection('mark');
        });
    }

    if (btnLink) {
        btnLink.addEventListener('click', function(e) {
            e.preventDefault();
            const url = prompt('Enter the URL:');
            if (url) {
                const selection = window.getSelection();
                if (selection.toString().length === 0) {
                    alert('Please select text to create a link');
                    return;
                }
                document.execCommand('createLink', false, url);
                articleContent.focus();
                htmlContentView.value = articleContent.innerHTML;
            }
        });
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeArticleCompose);
} else {
    initializeArticleCompose();
}

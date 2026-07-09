// Simple hash function to generate a short hash from a string
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and take last 8 characters
  return Math.abs(hash).toString(36).substring(0, 8);
}

// Auto-generate tag from title
function slugify(text) {
  const originalText = text.toLowerCase().trim();

  // Clean the text: remove special characters, keep spaces
  let cleaned = originalText.replace(/[^\w\s-]/g, "");

  // Take first 40 characters
  let slug = cleaned.substring(0, 40);

  // Replace spaces with hyphens and clean up
  slug = slug
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

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

// Function to apply Bootstrap classes to contenteditable content
function applyBootstrapClassesToEditable() {
  const articleContent = document.getElementById("articleContent");
  if (!articleContent) return;

  // Get all elements inside the contenteditable
  const elements = articleContent.querySelectorAll("*");

  elements.forEach((el) => {
    // Add classes based on tag
    if (el.tagName === "P") {
      addClassIfNotExists(el, "mb-3");
    } else if (["H1", "H2", "H3", "H4", "H5", "H6"].includes(el.tagName)) {
      addClassIfNotExists(el, "mb-3");
    } else if (el.tagName === "UL" || el.tagName === "OL") {
      addClassIfNotExists(el, "mb-3");
    } else if (el.tagName === "LI") {
      addClassIfNotExists(el, "mb-1");
    }
    // Add more as needed
  });
}

// Helper function to add class if not already present
function addClassIfNotExists(element, className) {
  const classes = element.className.split(" ");
  if (!classes.includes(className)) {
    element.className = (element.className + " " + className).trim();
  }
}

// Initialize once DOM is ready
function initializeArticleCompose() {
  const titleInput = document.getElementById("articleTitle");
  const tagInput = document.getElementById("articleTag");
  const tagStatus = document.getElementById("tagStatus");
  const tagFeedback = document.getElementById("tagFeedback");
  const articleForm = document.getElementById("articleForm");

  console.log("Initializing article compose...", {
    titleInput,
    tagInput,
    tagStatus,
    tagFeedback,
    articleForm,
  });

  if (!titleInput || !tagInput) {
    console.error("Article compose elements not found", {
      titleInput,
      tagInput,
    });
    return;
  }

  let tagCheckTimeout;

  // Generate tag from title on input - updates in real time
  titleInput.addEventListener("input", function () {
    console.log("Title input changed:", this.value);
    const slug = slugify(this.value);
    console.log("Generated slug:", slug);
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
  tagInput.addEventListener("input", function () {
    console.log("Tag input changed:", this.value);
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
    fetch("/users/check-tag/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tag: tag }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.available) {
          tagStatus.innerHTML = "✓";
          tagStatus.style.color = "#28a745";
          tagFeedback.innerHTML =
            '<span style="color: #28a745;">Tag is available</span>';
          tagInput.classList.remove("is-invalid");
          tagInput.classList.add("is-valid");
        } else {
          tagStatus.innerHTML = "✗";
          tagStatus.style.color = "#dc3545";
          tagFeedback.innerHTML =
            '<span style="color: #dc3545;">This tag already exists. Please choose a different one.</span>';
          tagInput.classList.remove("is-valid");
          tagInput.classList.add("is-invalid");
        }
      })
      .catch((error) => {
        console.error("Error checking tag:", error);
        resetTagStatus();
      });
  }

  function resetTagStatus() {
    tagStatus.innerHTML = "";
    tagFeedback.innerHTML = "";
    tagInput.classList.remove("is-valid", "is-invalid");
  }

  // Validate form before submission (Article Save)
  if (articleForm) {
    articleForm.addEventListener("submit", function (e) {
      if (tagInput.classList.contains("is-invalid")) {
        e.preventDefault();
        alert("Please choose an available tag for your article.");
        return false;
      }
      // Populate hidden content input with contentEditable innerHTML
      const contentInput = document.getElementById("contentInput");
      if (contentInput) {
        contentInput.value = articleContent.innerHTML;
      }
    });
  }

  // Handle File Upload Form Submission separately
  const fileUploadForm = document.getElementById("fileUploadForm");
  if (fileUploadForm) {
    fileUploadForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const formData = new FormData(this);
      const uploadUrl = this.dataset.uploadUrl;

      // Get CSRF token from the meta tag in layout.html
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = csrfMeta ? csrfMeta.getAttribute("content") : null;

      formData.append("csrf_token", csrfToken);

      if (!csrfToken) {
        alert("CSRF Token not found. Please reload the page.");
        return;
      }

      fetch(uploadUrl, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            // Try to get error message from response text if JSON fails
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
          return response.json();
        })
        .then((data) => {
          if (data.html) {
            // Insert converted HTML into the EDITOR, not a generic div
            const articleContent = document.getElementById("articleContent");
            if (articleContent) {
              // Switch to normal view if currently in HTML view to show formatted content
              switchToNormalView();
              articleContent.innerHTML = data.html;

              // Update hidden view as well
              htmlContentView.value = data.html;

              // Try to extract title from H1 tags
              extractTitleFromHTML(data.html);

              alert("Document converted successfully!");
            } else {
              alert("Editor content area not found.");
            }
          } else if (data.error) {
            alert("Conversion failed: " + data.error);
          } else {
            // Unexpected response structure
            console.error("Unexpected server response:", data);
            alert("Server returned unexpected data.");
          }
        })
        .catch((error) => {
          console.error("Upload error:", error);
          alert("An error occurred during upload.");
        });
    });
  }

  // Content view tabs (Normal vs HTML)
  const normalViewTab = document.getElementById("normal-view-tab");
  const htmlViewTab = document.getElementById("html-view-tab");
  const normalViewContainer = document.getElementById("normalViewContainer");
  const articleContent = document.getElementById("articleContent");
  const htmlContentView = document.getElementById("htmlContentView");

  if (normalViewTab && htmlViewTab && articleContent && htmlContentView) {
    normalViewTab.addEventListener("click", function () {
      // Switch to normal view
      normalViewTab.classList.add("active");
      htmlViewTab.classList.remove("active");
      normalViewContainer.style.display = "block";
      htmlContentView.style.display = "none";
      normalViewTab.style.borderBottom = "none";
      htmlViewTab.style.borderBottom = "1px solid #dee2e6";
      articleContent.focus();
    });

    htmlViewTab.addEventListener("click", function () {
      // Switch to HTML view
      normalViewTab.classList.remove("active");
      htmlViewTab.classList.add("active");
      normalViewContainer.style.display = "none";
      htmlContentView.style.display = "block";
      normalViewTab.style.borderBottom = "1px solid #dee2e6";
      htmlViewTab.style.borderBottom = "none";
      htmlContentView.focus();
    });

    // Sync content between both editors
    articleContent.addEventListener("input", function () {
      htmlContentView.value = this.innerHTML;
      // Debounce applying Bootstrap classes
      clearTimeout(window.bootstrapClassTimeout);
      window.bootstrapClassTimeout = setTimeout(
        applyBootstrapClassesToEditable,
        500,
      );
    });

    htmlContentView.addEventListener("input", function () {
      articleContent.innerHTML = this.value;
    });
  }

  // Formatting toolbar buttons
  const btnBold = document.getElementById("btnBold");
  const btnItalic = document.getElementById("btnItalic");
  const btnUnderline = document.getElementById("btnUnderline");
  const btnStrikethrough = document.getElementById("btnStrikethrough");
  const btnHighlight = document.getElementById("btnHighlight");
  const btnLink = document.getElementById("btnLink");

  // Heading dropdown
  const headingDropdownItems = document.querySelectorAll("[data-heading]");
  headingDropdownItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const heading = this.getAttribute("data-heading");
      document.execCommand("formatBlock", false, `<${heading}>`);
      applyBootstrapClassesToEditable();
      articleContent.focus();
      htmlContentView.value = articleContent.innerHTML;
    });
  });

  function wrapSelection(tag, attributes = "") {
    const selection = window.getSelection();
    if (selection.toString().length === 0) {
      alert("Please select text to format");
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement(tag);
    if (attributes) {
      span.setAttribute("style", attributes);
    }
    range.surroundContents(span);
    articleContent.focus();
    htmlContentView.value = articleContent.innerHTML;
  }

  if (btnBold) {
    btnBold.addEventListener("click", function (e) {
      e.preventDefault();
      document.execCommand("bold", false, null);
      applyBootstrapClassesToEditable();
      articleContent.focus();
      htmlContentView.value = articleContent.innerHTML;
    });
  }

  if (btnItalic) {
    btnItalic.addEventListener("click", function (e) {
      e.preventDefault();
      document.execCommand("italic", false, null);
      applyBootstrapClassesToEditable();
      articleContent.focus();
      htmlContentView.value = articleContent.innerHTML;
    });
  }

  if (btnUnderline) {
    btnUnderline.addEventListener("click", function (e) {
      e.preventDefault();
      document.execCommand("underline", false, null);
      applyBootstrapClassesToEditable();
      articleContent.focus();
      htmlContentView.value = articleContent.innerHTML;
    });
  }

  if (btnStrikethrough) {
    btnStrikethrough.addEventListener("click", function (e) {
      e.preventDefault();
      document.execCommand("strikethrough", false, null);
      applyBootstrapClassesToEditable();
      articleContent.focus();
      htmlContentView.value = articleContent.innerHTML;
    });
  }

  if (btnHighlight) {
    btnHighlight.addEventListener("click", function (e) {
      e.preventDefault();
      wrapSelection("mark");
      applyBootstrapClassesToEditable();
    });
  }

  if (btnLink) {
    btnLink.addEventListener("click", function (e) {
      e.preventDefault();
      const url = prompt("Enter the URL:");
      if (url) {
        const selection = window.getSelection();
        if (selection.toString().length === 0) {
          alert("Please select text to create a link");
          return;
        }
        document.execCommand("createLink", false, url);
        applyBootstrapClassesToEditable();
        articleContent.focus();
        htmlContentView.value = articleContent.innerHTML;
      }
    });
  }
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeArticleCompose);
} else {
  initializeArticleCompose();
}

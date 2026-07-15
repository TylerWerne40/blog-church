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

/**
 * Extracts potential title text from complex HTML structure for better UX fallback.
 * Searches within H1 tags or the first paragraph if no H1 is found.
 * @param {string} html - The HTML content.
 */
function extractTitleFromHTML(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  let titleCandidate = null;

  const h1 = tempDiv.querySelector("h1");
  if (h1) {
    titleCandidate = h1.textContent.trim();
  } else {
    const p = tempDiv.querySelector("p");
    if (p && p.textContent.trim()) {
      titleCandidate = p.textContent.trim();
    }
  }

  if (titleCandidate) {
    // Use slugify on the extracted text to get a usable tag name
    const derivedTitle = titleCandidate; // For immediate display feedback
    const derivedTag = slugify(derivedTitle);
    console.log("Extracted Title:", derivedTitle);
    console.log("Derived Tag from HTML:", derivedTag);

    // Update form fields with the extracted data as placeholders for the user to review/correct.
    document.getElementById("articleTitle").value = derivedTitle;
    document.getElementById("articleTag").value = derivedTag;
  } else {
    console.warn(
      "Could not automatically extract a title from the converted HTML content.",
    );
  }
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

function prettifyHTML(html) {
  let formatted = "";
  let indent = 0;
  const indentStr = "  "; // 2 spaces

  html.split(/(<[^>]+>)/g).forEach((token) => {
    if (token.match(/^<\//)) {
      // Closing tag
      indent--;
      formatted += indentStr.repeat(Math.max(0, indent)) + token + "\n";
    } else if (token.match(/^</) && !token.match(/\/$/)) {
      // Opening tag
      formatted += indentStr.repeat(indent) + token + "\n";
      if (!token.match(/^<(br|hr|img|input|meta|link)/i)) {
        indent++;
      }
    } else if (token.trim()) {
      // Text content
      formatted += indentStr.repeat(indent) + token.trim() + "\n";
    }
  });

  return formatted;
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
function switchToHtmlView() {
  currentViewMode = "html";
  // Switch to HTML view
  normalViewTab.classList.remove("active");
  htmlViewTab.classList.add("active");
  normalViewContainer.style.display = "none";
  htmlContentView.style.display = "block";
  normalViewTab.style.borderBottom = "1px solid #dee2e6";
  htmlViewTab.style.borderBottom = "none";
  htmlContentView.focus();
}

function switchToNormalView() {
  currentViewMode = "normal";
  // Switch to normal view
  normalViewTab.classList.add("active");
  htmlViewTab.classList.remove("active");
  normalViewContainer.style.display = "block";
  htmlContentView.style.display = "none";
  normalViewTab.style.borderBottom = "none";
  htmlViewTab.style.borderBottom = "1px solid #dee2e6";
  articleContent.focus();
}

// Initialize once DOM is ready
function initializeArticleCompose() {
  let tagCheckTimeout = null;
  const articleContent = document.getElementById("articleContent");
  const titleInput = document.getElementById("articleTitle");
  const tagInput = document.getElementById("articleTag");
  const tagStatus = document.getElementById("tagStatus");
  const tagFeedback = document.getElementById("tagFeedback");
  const articleForm = document.getElementById("articleForm");

  console.log("Initializing article compose...");
  try {
    console.log(">>> Reached point A - after element lookups");
    if (titleInput && tagInput) {
      // Generate tag from title on input - updates in real time
      console.log(">>> Reached point B - attaching title listener");
      titleInput.addEventListener("input", function () {
        console.log("Title input changed:", this.value);
        const slug = slugify(this.value);
        console.log("Generated slug:", slug);
        tagInput.value = slug;

        clearTimeout(tagCheckTimeout);
        if (slug) {
          tagCheckTimeout = setTimeout(() => {
            checkTagAvailability(slug);
          }, 300);
        } else {
          resetTagStatus();
        }
      });
    }
    console.log(">>> Reached point C - about to define checkTagAvailability");

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
    console.log(
      ">>> Reached point D - about to attach articleForm submit listener",
    );
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
    const fileUploadForm = document.getElementById("fileUploadForm");
    console.log("File upload form element:", fileUploadForm);
    if (fileUploadForm) {
      let uploadButton = fileUploadForm.querySelector('button[type="submit"]');
      fileUploadForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const uploadUrl = this.dataset.uploadUrl;
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        console.log("The extracted upload URL is:", uploadUrl);
        const csrfToken = csrfMeta ? csrfMeta.getAttribute("content") : null;
        if (!csrfToken) {
          alert("CSRF Token not found. Please reload the page.");
          return;
        }
        formData.append("csrf_token", csrfToken);
        formData.append("title", titleInput ? titleInput.value : "");
        formData.append("tag", tagInput ? tagInput.value : "");
        fetch(uploadUrl, {
          method: "POST",
          headers: {
            "X-CSRFToken": csrfToken,
          },
          body: formData,
        })
          .then((response) => {
            if (!response.ok) {
              let errorText;
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                return response.json().then((data) => ({ ok: false, data })); // Treat JSON errors gracefully
              } else {
                // If not JSON, read as text to capture potential HTML error page content
                return response
                  .text()
                  .then((text) => ({ ok: false, message: text }));
              }
            }
            return response.json();
          })
          .then((data) => {
            if (typeof data === "object" && data !== null && !("ok" in data)) {
              throw new Error(data.error || "Unknown API response error.");
            }
            if (data.html) {
              // const articleContent = document.getElementById("articleContent");
              const htmlContentView = document.getElementById("htmlContentView");
              const contentInput = document.getElementById("contentInput");

              if (articleContent) {
                if (typeof switchToNormalView === "function")
                  switchToNormalView();
                articleContent.innerHTML = data.html;
                if (contentInput) contentInput.value = data.html;
                if (htmlContentView) htmlContentView.value = data.html;

                if (typeof extractTitleFromHTML === "function")
                  extractTitleFromHTML(data.html);
                const fallbackTitle = data.title || "Converted Article";
                const fallbackTag = data.tag || slugify(fallbackTitle);
                console.log("Fallback Title:", fallbackTitle);
                console.log("Fallback Tag:", fallbackTag);
                // Safe assignment via localized elements
                const tElem = document.getElementById("articleTitle");
                const gElem = document.getElementById("articleTag");
                if (tElem) tElem.value = fallbackTitle || "Converted Article";
                if (gElem)
                  gElem.value =
                    fallbackTag ||
                    (typeof slugify === "function" ? slugify(fallbackTitle) : "");

                const fInput = document.getElementById("fileInput");
                const sBtn = fileUploadForm.querySelector(
                  'button[type="submit"]',
                );
                if (fInput) fInput.disabled = true;
                if (sBtn) sBtn.disabled = true;

                alert("Document converted successfully!");
              } else {
                // Unexpected response structure
                console.log("Unexpected response structure:", data);
                console.error("Unexpected server response:", data);
                alert("Server returned unexpected data.");
              }
            }
          })
          .catch((error) => {
            console.error("Upload error:", error);
            let errorMessage = "";
            alert("An error occurred during upload.");
            if (
              typeof error === "object" &&
              error !== null &&
              !("message" in error)
            ) {
              const dataObject = Object.assign({}, error, { message: "" });
              if (dataObject.ok === false && dataObject.message) {
                errorMessage = `Server responded with error status (${error.status || "?"}). Details: ${dataObject.message}`;
              } else if (typeof dataObject.message === "string") {
                errorMessage += dataObject.message;
              }
            } else if (error instanceof Error) {
              errorMessage += error.message;
            }
            if (
              typeof error === "object" &&
              error !== null &&
              error.message &&
              (error.message.includes("HTTP") || error.message.includes("[HTTP"))
            ) {
              errorMessage = error.message;
            } else if (error instanceof Error) {
              errorMessage += `Operation failed: ${error.message}`;
            }

            alert(
              `File Upload Failed!\\n\\n--- ERROR DETAILS --- \\n${errorMessage}`,
            );
          });
      });
    }

    // Content view tabs (Normal vs HTML)
    const normalViewTab = document.getElementById("normal-view-tab");
    const htmlViewTab = document.getElementById("html-view-tab");
    const normalViewContainer = document.getElementById("normalViewContainer");
    // const articleContent = document.getElementById("articleContent");
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
  } catch (error) {
    console.error(">>> CRASH INSIDE initializeArticleCompose:", error);
    console.error("Stack:", error.stack);
  }
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeArticleCompose);
} else {
  initializeArticleCompose();
}
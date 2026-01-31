// File upload and conversion handler
document.addEventListener('DOMContentLoaded', function() {
    const fileUploadForm = document.getElementById('fileUploadForm');
    
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('fileInput');
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await fetch(fileUploadForm.getAttribute('data-upload-url'), {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    document.getElementById('conversionResult').innerHTML = '<div class="alert alert-success">File converted successfully!</div>' + data.html;
                } else {
                    document.getElementById('conversionResult').innerHTML = '<div class="alert alert-danger">' + data.error + '</div>';
                }
            } catch (error) {
                document.getElementById('conversionResult').innerHTML = '<div class="alert alert-danger">Error: ' + error.message + '</div>';
            }
        });
    }
});

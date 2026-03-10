document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('url-form');
    const urlInput = document.getElementById('vimeo-url');
    const passwordInput = document.getElementById('vimeo-password');
    const searchBtn = document.getElementById('search-btn');
    const btnText = searchBtn.querySelector('span');
    const spinner = searchBtn.querySelector('.loader-spinner');
    const errorMsg = document.getElementById('error-message');
    const videoInfo = document.getElementById('video-info');
    const downloadBtn = document.getElementById('download-btn');

    // Fetch and display version (only if in Electron)
    if (window.electronAPI) {
        window.electronAPI.getAppVersion().then(version => {
            document.getElementById('app-version').textContent = version;
        });
    }

    let currentVideoData = null;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        const password = passwordInput.value.trim();

        if (!url) return;

        // Reset UI
        errorMsg.classList.add('hidden');
        videoInfo.classList.add('hidden');
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        searchBtn.disabled = true;

        try {
            const response = await fetch('/api/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ocurrió un error al procesar el video.');
            }

            currentVideoData = { ...data, password };

            // Populate info card
            document.getElementById('video-title').textContent = data.title;
            document.getElementById('video-thumbnail').src = data.thumbnail || 'https://via.placeholder.com/640x360.png?text=Sin+Miniatura';
            document.getElementById('video-duration').textContent = data.duration;

            // Populate Quality Selector
            const qualitySelect = document.getElementById('quality-select');
            qualitySelect.innerHTML = '';

            if (data.formats && data.formats.length > 0) {
                data.formats.forEach(f => {
                    const option = document.createElement('option');
                    option.value = f.id;
                    option.textContent = f.label;
                    qualitySelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Calidad estándar (Auto)';
                qualitySelect.appendChild(option);
            }

            videoInfo.classList.remove('hidden');

        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
        } finally {
            btnText.style.display = 'block';
            spinner.style.display = 'none';
            searchBtn.disabled = false;
        }
    });

    const downloadMp3Btn = document.getElementById('download-mp3-btn');

    async function handleDownload(btn, format) {
        if (!currentVideoData) return;

        const { url, title, password } = currentVideoData;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<div class="loader-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></div>';
        btn.disabled = true;

        const safeTitle = (title || 'video-descargado').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-');
        const filename = `${safeTitle || 'video'}.${format}`;
        let downloadUrl = `/api/download?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&format=${format}`;

        if (format === 'mp4') {
            const qualitySelect = document.getElementById('quality-select');
            if (qualitySelect && qualitySelect.value) {
                downloadUrl += `&qualityId=${encodeURIComponent(qualitySelect.value)}`;
            }
        }

        if (password) {
            downloadUrl += `&password=${encodeURIComponent(password)}`;
        }

        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error('Error en la descarga');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);

            a.click();

            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Hubo un problema al descargar el archivo.');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }

    downloadBtn.addEventListener('click', () => handleDownload(downloadBtn, 'mp4'));
    if (downloadMp3Btn) {
        downloadMp3Btn.addEventListener('click', () => handleDownload(downloadMp3Btn, 'mp3'));
    }
});

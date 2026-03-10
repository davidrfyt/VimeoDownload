const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

// Determine if we are running in Electron
const isElectron = !!process.versions.electron;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Determine binary paths (handles dev and packaged versions)
let ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
let ffmpegPath = ffmpeg;

if (isElectron) {
    const { app: electronApp } = require('electron');
    const isProd = electronApp.isPackaged;

    if (isProd) {
        // In packaged Electron apps, binaries move to the 'resources' folder
        const resourcePath = process.resourcesPath;
        ytDlpPath = path.join(resourcePath, 'yt-dlp.exe');
        ffmpegPath = path.join(resourcePath, 'ffmpeg.exe');
    }
}

// Fetch video info
app.post('/api/info', (req, res) => {
    const { url, password } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'Proporciona una URL válida.' });
    }

    const args = ['-j', '--no-warnings', url];
    if (password) {
        args.push('--video-password', password);
    }

    const proc = spawn(ytDlpPath, args);
    let data = '';
    let errorData = '';

    proc.stdout.on('data', chunk => {
        data += chunk.toString();
    });

    proc.stderr.on('data', chunk => {
        errorData += chunk.toString();
    });

    proc.on('close', code => {
        if (code !== 0) {
            console.error('yt-dlp error:', errorData);
            let userError = 'No se pudo obtener información del video. Revisa la URL.';
            if (errorData.includes('password') || errorData.includes('Password correct?') || errorData.includes('401') || errorData.includes('404')) {
                userError = 'El video requiere una contraseña, es privado, o la contraseña es incorrecta. (' + errorData.split('\n')[0].replace('ERROR: ', '') + ')';
            } else {
                userError = 'Error: ' + errorData.split('\n')[0].replace('ERROR: ', '');
            }
            return res.status(500).json({ error: userError });
        }
        try {
            const info = JSON.parse(data);
            res.json({
                title: info.title,
                thumbnail: info.thumbnail,
                duration: info.duration_string || `${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}`,
                url: url
            });
        } catch (e) {
            console.error('JSON parse error:', e);
            res.status(500).json({ error: 'Error al procesar la respuesta del servidor.' });
        }
    });
});

// Download endpoint
app.get('/api/download', (req, res) => {
    const { url, title, format, password } = req.query;
    if (!url) {
        return res.status(400).send('URL de descarga requerida.');
    }

    // Strip everything except alphanumeric, spaces, dashes and underscores for maximum compatibility
    const safeTitle = (title || 'video-descargado')
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    const isAudio = format === 'mp3';
    const ext = isAudio ? 'mp3' : 'mp4';
    const filename = `${safeTitle || 'video'}.${ext}`;

    // Simple, robust Content-Disposition
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

    let args = [];
    if (isAudio) {
        args = [
            '--ffmpeg-location', ffmpegPath,
            '-q', '-o', '-',
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            url
        ];
    } else {
        args = [
            '-q', '-o', '-',
            '-f', 'best[ext=mp4]/best',
            url
        ];
    }

    if (password) {
        args.push('--video-password', password);
    }

    const proc = spawn(ytDlpPath, args);

    proc.stdout.pipe(res);

    proc.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
    });

    req.on('close', () => {
        // Matar el proceso si el cliente cancela la petición
        proc.kill();
    });
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

module.exports = app;

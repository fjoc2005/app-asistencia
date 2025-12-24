// ===================================
// APP Asistencia - Google Drive Integration
// Photo upload to Google Drive organized by date
// ===================================

// Google API Configuration
const GOOGLE_CONFIG = {
    apiKey: 'YOUR_API_KEY', // Replace with your API key
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // Replace with your client ID
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scope: 'https://www.googleapis.com/auth/drive.file'
};

let gapiInited = false;
let gisInited = false;
let tokenClient;

// Initialize Google API
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.apiKey,
            discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
        });
        gapiInited = true;
        console.log('Google API initialized');
    } catch (error) {
        console.error('Error initializing Google API:', error);
    }
}

// Initialize Google Identity Services
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.clientId,
        scope: GOOGLE_CONFIG.scope,
        callback: '', // Will be set per request
    });
    gisInited = true;
    console.log('Google Identity Services initialized');
}

// Request authorization
function requestAuthorization(callback) {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        callback();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// Get or create folder by date
async function getOrCreateDateFolder(date) {
    try {
        // Format date as YYYY-MM-DD
        const folderName = date.toISOString().split('T')[0];

        // Search for existing folder
        const response = await gapi.client.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }

        // Create new folder
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };

        const folder = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });

        return folder.result.id;
    } catch (error) {
        console.error('Error creating/getting folder:', error);
        throw error;
    }
}

// Upload photo to Google Drive
async function uploadPhotoToDrive(photoBlob, rut, onProgress) {
    try {
        if (!gapiInited || !gisInited) {
            throw new Error('Google API not initialized');
        }

        // Request authorization if needed
        await new Promise((resolve, reject) => {
            if (gapi.client.getToken() === null) {
                requestAuthorization(resolve);
            } else {
                resolve();
            }
        });

        // Get or create folder for today's date
        const today = new Date();
        const folderId = await getOrCreateDateFolder(today);

        // Clean RUT for filename
        const cleanedRut = rut.replace(/[^0-9kK]/g, '');
        const fileName = `${cleanedRut}.jpg`;

        // Prepare file metadata
        const metadata = {
            name: fileName,
            mimeType: 'image/jpeg',
            parents: [folderId]
        };

        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise((resolve) => {
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(photoBlob);
        });

        // Upload file
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: image/jpeg\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim;

        const request = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });

        if (onProgress) {
            onProgress(50);
        }

        const response = await request;

        if (onProgress) {
            onProgress(100);
        }

        return {
            success: true,
            fileId: response.result.id,
            fileName: fileName,
            folderId: folderId
        };

    } catch (error) {
        console.error('Error uploading to Drive:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Fallback: Save photo locally if Drive upload fails
function savePhotoLocally(photoBlob, rut) {
    const cleanedRut = rut.replace(/[^0-9kK]/g, '');
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${date}_${cleanedRut}.jpg`;

    // Create download link
    const url = URL.createObjectURL(photoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
        success: true,
        local: true,
        fileName: fileName
    };
}

// Initialize on page load
if (typeof gapi !== 'undefined') {
    gapiLoaded();
}

// Load Google Identity Services
const script = document.createElement('script');
script.src = 'https://accounts.google.com/gsi/client';
script.onload = gisLoaded;
document.head.appendChild(script);

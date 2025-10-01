// matter2mqtt-pair/web/app.js
const scanner = new Html5QrcodeScanner("qr-reader", { 
    fps: 10, 
    qrbox: 250 
});

scanner.render((decodedText) => {
    // Extract pairing code from QR
    document.getElementById('code').value = decodedText;
    document.getElementById('scanner').style.display = 'none';
    document.getElementById('pairForm').style.display = 'block';
    scanner.clear();
});

document.getElementById('pairForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        code: document.getElementById('code').value,
        name: document.getElementById('name').value,
        node_id: parseInt(document.getElementById('nodeId').value)
    };
    
    const response = await fetch('/api/pair', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
        document.getElementById('result').innerHTML = `
            <h2>Success!</h2>
            <p>Add this to devices.yaml:</p>
            <pre>${result.yaml}</pre>
            <p>Then restart matter2mqtt</p>
        `;
    } else {
        document.getElementById('result').innerHTML = `<p>Error: ${result.message}</p>`;
    }
});
const fs = require('fs');
const path = require('path');

async function updateWebConfig(contractAddress, networkId) {
    try {
        // Path to the web interface config file
        const configPath = path.join(__dirname, '../web-interface/src/config.json');
        
        // Read existing config
        let config = {};
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configContent);
        }

        // Update config
        config.contractAddress = contractAddress;
        config.networkId = networkId;

        // Write updated config
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log('Web interface config updated successfully');
        console.log('Contract Address:', contractAddress);
        console.log('Network ID:', networkId);
    } catch (error) {
        console.error('Error updating web interface config:', error);
    }
}

module.exports = updateWebConfig; 
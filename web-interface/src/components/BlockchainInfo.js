import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Divider, Box, Collapse } from '@mui/material';
import { ethers } from 'ethers';

const getAttackDetails = (result) => {
  const details = {
    replay: {
      title: "Replay Attack Details",
      description: "Attacker attempts to reuse previously valid flight data",
      technicalDetails: [
        `Original Timestamp: ${result.original?.timestamp.toLocaleTimeString()}`,
        `Replayed Timestamp: ${result.attacked?.timestamp.toLocaleTimeString()}`,
        `Time Difference: ${Math.floor((result.original?.timestamp - result.attacked?.timestamp) / 1000)} seconds`,
        "Vulnerability: Traditional system accepts old timestamps without verification",
        "Protection: Blockchain validates temporal consistency of flight data"
      ]
    },
    spoofing: {
      title: "Data Spoofing Attack Details",
      description: "Attacker injects false flight position data",
      technicalDetails: [
        `Original Position: ${result.original?.latitude.toFixed(4)}°, ${result.original?.longitude.toFixed(4)}°`,
        `Spoofed Position: ${result.attacked?.latitude.toFixed(4)}°, ${result.attacked?.longitude.toFixed(4)}°`,
        `Position Shift: ${(Math.abs(result.attacked?.latitude - result.original?.latitude)).toFixed(4)}°, ${(Math.abs(result.attacked?.longitude - result.original?.longitude)).toFixed(4)}°`,
        "Vulnerability: Traditional system lacks position change validation",
        "Protection: Blockchain validates physical movement constraints"
      ]
    },
    tampering: {
      title: "Data Tampering Attack Details",
      description: "Attacker modifies legitimate flight data",
      technicalDetails: [
        `Original Altitude: ${result.original?.altitude}m`,
        `Tampered Altitude: ${result.attacked?.altitude}m`,
        `Altitude Change: ${result.attacked?.altitude - result.original?.altitude}m`,
        `Original Velocity: ${result.original?.velocity || 0} knots`,
        `Tampered Velocity: ${result.attacked?.velocity || 0} knots`,
        "Vulnerability: Traditional system allows direct data modification",
        "Protection: Blockchain ensures data integrity through immutable records"
      ]
    }
  };
  return details[result.type] || { title: "Unknown Attack", description: "Attack type not recognized", technicalDetails: [] };
};

const BlockchainInfo = ({ contract, attackResults }) => {
  const [networkInfo, setNetworkInfo] = useState({
    address: '',
    network: '',
    blockNumber: '',
    balance: ''
  });
  const [expandedAttack, setExpandedAttack] = useState(null);

  useEffect(() => {
    const updateBlockchainInfo = async () => {
      if (!contract) return;

      try {
        const provider = contract.provider;
        const signer = contract.signer;
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        const balance = await provider.getBalance(address);

        setNetworkInfo({
          address,
          network: `${network.name} (Chain ID: ${network.chainId})`,
          blockNumber: blockNumber.toString(),
          balance: ethers.utils.formatEther(balance)
        });
      } catch (error) {
        console.error('Error fetching blockchain info:', error);
      }
    };

    updateBlockchainInfo();
    const interval = setInterval(updateBlockchainInfo, 10000);

    return () => clearInterval(interval);
  }, [contract]);

  const handleAttackClick = (index) => {
    setExpandedAttack(expandedAttack === index ? null : index);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Blockchain Information
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Wallet Address"
                secondary={networkInfo.address || 'Not connected'}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Network"
                secondary={networkInfo.network || 'Unknown'}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Current Block"
                secondary={networkInfo.blockNumber || 'Unknown'}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Balance"
                secondary={`${networkInfo.balance || '0'} ETH`}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Attack Detection Analysis
          </Typography>
          <List>
            {attackResults.map((result, index) => {
              const attackDetails = getAttackDetails(result);
              return (
                <React.Fragment key={index}>
                  <ListItem button onClick={() => handleAttackClick(index)}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" color="primary">
                          {result.type.charAt(0).toUpperCase() + result.type.slice(1)} Attack on {result.targetFlight}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2">
                            Time: {result.timestamp.toLocaleTimeString()}
                          </Typography>
                          <Typography variant="body2">
                            {attackDetails.description}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Collapse in={expandedAttack === index}>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {attackDetails.title}
                      </Typography>
                      {attackDetails.technicalDetails.map((detail, i) => (
                        <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          • {detail}
                        </Typography>
                      ))}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                          Traditional System: Not Detected
                          <Typography component="span" variant="body2" color="text.secondary">
                            {" "}(No cryptographic verification)
                          </Typography>
                        </Typography>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                          Blockchain System: Detected
                          <Typography component="span" variant="body2" color="text.secondary">
                            {" "}(Verified through smart contract)
                          </Typography>
                        </Typography>
                      </Box>
                    </Box>
                  </Collapse>
                  {index < attackResults.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
            {attackResults.length === 0 && (
              <ListItem>
                <ListItemText
                  secondary="No attacks detected yet"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BlockchainInfo; 
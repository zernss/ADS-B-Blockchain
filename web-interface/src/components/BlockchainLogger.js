import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Clear,
  Refresh,
  Info,
  CheckCircle,
  Warning,
  Error,
  Receipt,
  Block,
  Event
} from '@mui/icons-material';
import blockchainLogger from '../services/BlockchainLogger';

const getLevelIcon = (level) => {
  switch (level) {
    case 'info':
      return <Info color="info" />;
    case 'success':
      return <CheckCircle color="success" />;
    case 'warning':
      return <Warning color="warning" />;
    case 'error':
      return <Error color="error" />;
    case 'transaction':
      return <Receipt color="primary" />;
    case 'block':
      return <Block color="secondary" />;
    case 'event':
      return <Event color="info" />;
    default:
      return <Info />;
  }
};

const getLevelColor = (level) => {
  switch (level) {
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'transaction':
      return 'primary';
    case 'block':
      return 'secondary';
    case 'event':
      return 'info';
    default:
      return 'default';
  }
};

const BlockchainLoggerComponent = () => {
  const [logs, setLogs] = useState([]);
  const [networkInfo, setNetworkInfo] = useState({});
  const [logStats, setLogStats] = useState({});
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [filterLevel, setFilterLevel] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Update logs when logger has new entries
    const handleLogUpdate = (logEntry) => {
      if (logEntry.type === 'clear') {
        setLogs([]);
        setExpandedLogs(new Set());
      } else {
        setLogs(blockchainLogger.getLogs());
        setLogStats(blockchainLogger.getLogStats());
      }
    };

    // Update network info periodically
    const updateNetworkInfo = () => {
      setNetworkInfo(blockchainLogger.getNetworkInfo());
      setIsConnected(!!blockchainLogger.provider);
    };

    // Initial setup
    setLogs(blockchainLogger.getLogs());
    setLogStats(blockchainLogger.getLogStats());
    updateNetworkInfo();

    // Add listeners
    blockchainLogger.addListener(handleLogUpdate);
    
    // Update network info every 5 seconds
    const networkInterval = setInterval(updateNetworkInfo, 5000);

    return () => {
      blockchainLogger.removeListener(handleLogUpdate);
      clearInterval(networkInterval);
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const handleLogToggle = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const handleClearLogs = () => {
    blockchainLogger.clearLogs();
  };

  const handleRefresh = () => {
    setLogs(blockchainLogger.getLogs());
    setLogStats(blockchainLogger.getLogStats());
    setNetworkInfo(blockchainLogger.getNetworkInfo());
  };

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString();
  };

  const formatData = (data) => {
    if (!data || Object.keys(data).length === 0) return null;
    
    return Object.entries(data).map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value, null, 2);
      }
      return (
        <Box key={key} sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
            {key}:
          </Typography>
          <Typography variant="body2" sx={{ ml: 1, fontFamily: 'monospace' }}>
            {displayValue}
          </Typography>
        </Box>
      );
    });
  };

  return (
    <Grid container spacing={2}>
      {/* Network Status Card */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Network Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'error'}
                size="small"
              />
            </Box>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Network"
                  secondary={networkInfo.networkName || 'Unknown'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Chain ID"
                  secondary={networkInfo.chainId || 'Unknown'}
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
                  primary="Gas Price"
                  secondary={networkInfo.gasPrice ? 
                    `${parseFloat(ethers.utils.formatUnits(networkInfo.gasPrice, 'gwei')).toFixed(2)} gwei` : 
                    'Unknown'
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Last Update"
                  secondary={networkInfo.lastUpdate ? 
                    networkInfo.lastUpdate.toLocaleTimeString() : 
                    'Never'
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Log Statistics Card */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Log Statistics
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2">
                Total Logs: {logStats.total || 0}
              </Typography>
              <Typography variant="body2" color="primary">
                Recent Activity: {logStats.recentActivity || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(logStats.byLevel || {}).map(([level, count]) => (
                <Chip
                  key={level}
                  label={`${level}: ${count}`}
                  color={getLevelColor(level)}
                  size="small"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Controls Card */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Controls
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter Level</InputLabel>
                <Select
                  value={filterLevel}
                  label="Filter Level"
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="transaction">Transaction</MenuItem>
                  <MenuItem value="block">Block</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  fullWidth
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearLogs}
                  fullWidth
                >
                  Clear
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Logs Display */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Blockchain Activity Logs ({filteredLogs.length})
              </Typography>
              <Chip
                label={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                color={autoScroll ? 'success' : 'default'}
                size="small"
                onClick={() => setAutoScroll(!autoScroll)}
                clickable
              />
            </Box>
            
            {!isConnected && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Blockchain logger is not connected. Make sure your wallet is connected and the contract is deployed.
              </Alert>
            )}

            <Paper
              id="log-container"
              sx={{
                height: '400px',
                overflow: 'auto',
                p: 2,
                backgroundColor: '#f5f5f5'
              }}
            >
              {filteredLogs.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">
                    No logs to display
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {filteredLogs.map((log, index) => (
                    <React.Fragment key={log.id}>
                      <ListItem
                        button
                        onClick={() => handleLogToggle(log.id)}
                        sx={{
                          backgroundColor: 'white',
                          mb: 1,
                          borderRadius: 1,
                          border: `1px solid ${getLevelColor(log.level) === 'default' ? '#ddd' : 'transparent'}`
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                          {getLevelIcon(log.level)}
                        </Box>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {log.message}
                              </Typography>
                              <Chip
                                label={log.level}
                                color={getLevelColor(log.level)}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                          }
                        />
                        <IconButton size="small">
                          {expandedLogs.has(log.id) ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </ListItem>
                      <Collapse in={expandedLogs.has(log.id)}>
                        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            {log.formatted}
                          </Typography>
                          {log.data && Object.keys(log.data).length > 0 && (
                            <Box sx={{ mt: 1, p: 1, backgroundColor: '#f8f8f8', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                Additional Data:
                              </Typography>
                              {formatData(log.data)}
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                      {index < filteredLogs.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default BlockchainLoggerComponent; 
import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import traditionalLogger from '../services/TraditionalLogger';

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
    default:
      return 'default';
  }
};

const TraditionalLoggerComponent = () => {
  const [logs, setLogs] = useState([]);
  const [logStats, setLogStats] = useState({});
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [filterLevel, setFilterLevel] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const handleLogUpdate = (logEntry) => {
      if (logEntry.type === 'clear') {
        setLogs([]);
        setExpandedLogs(new Set());
      } else {
        setLogs(traditionalLogger.getLogs());
        setLogStats(traditionalLogger.getLogStats());
      }
    };

    setLogs(traditionalLogger.getLogs());
    setLogStats(traditionalLogger.getLogStats());
    traditionalLogger.addListener(handleLogUpdate);

    return () => {
      traditionalLogger.removeListener(handleLogUpdate);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      const logContainer = document.getElementById('traditional-log-container');
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
    traditionalLogger.clearLogs();
  };

  const handleRefresh = () => {
    setLogs(traditionalLogger.getLogs());
    setLogStats(traditionalLogger.getLogStats());
  };

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString();
  };

  const formatData = (data) => {
    if (!data || Object.keys(data).length === 0) return null;
    return Object.entries(data).map(([key, value]) => (
      <Box key={key} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>{key}:</Typography>
        <Typography variant="body2" sx={{ ml: 1, fontFamily: 'monospace' }}>
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
        </Typography>
      </Box>
    ));
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Activity Logs ({filteredLogs.length})</Typography>
              <Button onClick={() => setAutoScroll(!autoScroll)} variant={autoScroll ? 'contained' : 'outlined'}>
                Auto-scroll {autoScroll ? 'ON' : 'OFF'}
              </Button>
            </Box>
            <Paper id="traditional-log-container" sx={{ mt: 2, p: 2, height: '60vh', overflowY: 'scroll', backgroundColor: 'grey.50' }}>
              {filteredLogs.length === 0 && <Typography>No logs yet.</Typography>}
              <List dense>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <ListItem
                      onClick={() => handleLogToggle(log.id)}
                      sx={{ cursor: 'pointer', borderLeft: `4px solid`, borderColor: `${getLevelColor(log.level)}.main` }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getLevelIcon(log.level)}
                            <Typography variant="body1" sx={{ ml: 1, fontWeight: 'bold' }}>{log.message}</Typography>
                            <Chip label={log.level} size="small" color={getLevelColor(log.level)} sx={{ ml: 'auto' }} />
                          </Box>
                        }
                        secondary={formatTimestamp(log.timestamp)}
                      />
                      <IconButton size="small">
                        {expandedLogs.has(log.id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </ListItem>
                    <Collapse in={expandedLogs.has(log.id)}>
                      <Box sx={{ p: 2, backgroundColor: 'grey.100' }}>
                        <Typography variant="subtitle2" gutterBottom>Additional Data:</Typography>
                        {formatData(log.data)}
                      </Box>
                    </Collapse>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Log Statistics</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(logStats).map(([level, count]) => (
                count > 0 && <Chip key={level} label={`${level}: ${count}`} color={getLevelColor(level)} />
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Controls</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
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
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={handleRefresh} startIcon={<Refresh />}>Refresh</Button>
              <Button variant="outlined" color="error" onClick={handleClearLogs} startIcon={<Clear />}>Clear</Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default TraditionalLoggerComponent; 
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Chip,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Block as BlockIcon,
  Receipt as ReceiptIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import blockchainLogger from '../services/BlockchainLogger';

const BlockchainActivityLogger = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [stats, setStats] = useState({});
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (logsEndRef.current && autoScroll && !isUserScrolling) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold
    
    // If user is at bottom, allow auto-scroll
    if (isAtBottom) {
      setIsUserScrolling(false);
    } else {
      setIsUserScrolling(true);
    }
  };

  useEffect(() => {
    const updateLogs = () => {
      const blockchainLogs = blockchainLogger.getBlockchainActivityLogs();
      setLogs(blockchainLogs);
      setStats(blockchainLogger.getBlockchainActivityStats());
      
      // Only auto-scroll if user is at bottom and auto-scroll is enabled
      if (autoScroll && !isUserScrolling) {
        setTimeout(scrollToBottom, 100);
      }
    };

    // Initial update
    updateLogs();

    // Set up listener for real-time updates
    const listener = () => updateLogs();
    blockchainLogger.addListener(listener);

    // Update every 2 seconds for real-time feel
    const interval = setInterval(updateLogs, 2000);

    return () => {
      blockchainLogger.removeListener(listener);
      clearInterval(interval);
    };
  }, [autoScroll, isUserScrolling]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'block': return <BlockIcon fontSize="small" />;
      case 'transaction': return <ReceiptIcon fontSize="small" />;
      case 'event': return <EventIcon fontSize="small" />;
      case 'rejection': return <WarningIcon fontSize="small" />;
      case 'pending': return <ScheduleIcon fontSize="small" />;
      case 'gas': return <CheckCircleIcon fontSize="small" />;
      case 'nonce': return <CheckCircleIcon fontSize="small" />;
      default: return <CheckCircleIcon fontSize="small" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'block': return 'primary';
      case 'transaction': return 'success';
      case 'event': return 'info';
      case 'rejection': return 'error';
      case 'pending': return 'warning';
      case 'gas': return 'secondary';
      case 'nonce': return 'default';
      default: return 'default';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const handleClearLogs = () => {
    blockchainLogger.clearBlockchainActivityLogs();
  };

  const handleRefresh = () => {
    setLogs([...blockchainLogger.getBlockchainActivityLogs()]);
  };

  const handleAutoScrollToggle = () => {
    setAutoScroll(!autoScroll);
    // If turning on auto-scroll, scroll to bottom immediately
    if (!autoScroll) {
      setTimeout(() => {
        setIsUserScrolling(false);
        scrollToBottom();
      }, 100);
    }
  };

  const formatLogContent = (log) => {
    return log.formatted.split('\n').map((line, index) => {
      if (line.includes('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')) {
        return <Divider key={index} sx={{ my: 1 }} />;
      }
      if (line.includes('🔗 BLOCKCHAIN DETAILS:')) {
        return (
          <Typography key={index} variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mt: 1 }}>
            {line}
          </Typography>
        );
      }
      if (line.includes('🔗') || line.includes('🧱') || line.includes('⛽') || line.includes('💰') || line.includes('🔢')) {
        return (
          <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {line}
          </Typography>
        );
      }
      return (
        <Typography key={index} variant="body2">
          {line}
        </Typography>
      );
    });
  };

  const logsContainerStyle = isFullscreen
    ? {
        flexGrow: 1,
        minHeight: 0,
        maxHeight: '100vh',
        overflow: 'auto',
        p: 2,
        bgcolor: 'grey.50',
        fontFamily: 'monospace',
      }
    : {
        flexGrow: 1,
        overflow: 'auto',
        maxHeight: 400,
        p: 2,
        bgcolor: 'grey.50',
        fontFamily: 'monospace',
      };

  // Fullscreen overlay content
  const fullscreenContent = (
    <>
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'rgba(0,0,0,0.3)',
        zIndex: 1999
      }} />
      <Card 
        sx={{ 
          height: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 2000,
          background: 'white',
          borderRadius: 0,
          boxShadow: 24,
          display: 'flex', flexDirection: 'column'
        }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              🔗 Blockchain Activity Monitor
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Expand to Fullscreen'}>
                <IconButton size="small" onClick={() => setIsFullscreen(f => !f)}>
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear Logs">
                <IconButton size="small" onClick={handleClearLogs}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Statistics */}
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={1}>
              <Grid item>
                <Chip 
                  icon={<BlockIcon />} 
                  label={`${stats.byType?.block || 0} Blocks`} 
                  color="primary" 
                  size="small" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  icon={<ReceiptIcon />} 
                  label={`${stats.byType?.transaction || 0} TXs`} 
                  color="success" 
                  size="small" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  icon={<EventIcon />} 
                  label={`${stats.byType?.event || 0} Events`} 
                  color="info" 
                  size="small" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  icon={<WarningIcon />} 
                  label={`${stats.byType?.rejection || 0} Rejections`} 
                  color="error" 
                  size="small" 
                />
              </Grid>
            </Grid>
          </Box>

          {/* Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filter}
                label="Filter"
                onChange={(e) => setFilter(e.target.value)}
              >
                <MenuItem value="all">All Activities</MenuItem>
                <MenuItem value="block">Blocks</MenuItem>
                <MenuItem value="transaction">Transactions</MenuItem>
                <MenuItem value="event">Events</MenuItem>
                <MenuItem value="rejection">Rejections</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="gas">Gas Usage</MenuItem>
                <MenuItem value="nonce">Nonce</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              size="small"
              variant={autoScroll ? "contained" : "outlined"}
              onClick={handleAutoScrollToggle}
            >
              {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
            </Button>
            
            {isUserScrolling && autoScroll && (
              <Chip 
                label="Scroll to bottom to resume auto-scroll" 
                color="warning" 
                size="small" 
              />
            )}
          </Box>

          {/* Logs Display */}
          <Paper 
            ref={logsContainerRef}
            onScroll={handleScroll}
            sx={logsContainerStyle}
          >
            {filteredLogs.length === 0 ? (
              <Alert severity="info">
                No blockchain activity logged yet. Start interacting with the blockchain to see activity here.
              </Alert>
            ) : (
              <Box>
                {filteredLogs.map((log) => (
                  <Box key={log.id} sx={{ mb: 2, p: 1, bgcolor: 'white', borderRadius: 1, border: 1, borderColor: 'grey.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getTypeIcon(log.type)}
                      <Chip 
                        label={log.type.toUpperCase()} 
                        color={getTypeColor(log.type)} 
                        size="small" 
                        sx={{ ml: 1, mr: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {log.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 3 }}>
                      {formatLogContent(log)}
                    </Box>
                  </Box>
                ))}
                <div ref={logsEndRef} />
              </Box>
            )}
          </Paper>

          {/* Footer */}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Total: {filteredLogs.length} activities
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Real-time blockchain monitoring active
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </>
  );

  return (
    <>
      {isFullscreen
        ? ReactDOM.createPortal(fullscreenContent, document.body)
        : (
          <Card 
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  🔗 Blockchain Activity Monitor
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Expand to Fullscreen'}>
                    <IconButton size="small" onClick={() => setIsFullscreen(f => !f)}>
                      {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear Logs">
                    <IconButton size="small" onClick={handleClearLogs}>
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Statistics */}
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item>
                    <Chip 
                      icon={<BlockIcon />} 
                      label={`${stats.byType?.block || 0} Blocks`} 
                      color="primary" 
                      size="small" 
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      icon={<ReceiptIcon />} 
                      label={`${stats.byType?.transaction || 0} TXs`} 
                      color="success" 
                      size="small" 
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      icon={<EventIcon />} 
                      label={`${stats.byType?.event || 0} Events`} 
                      color="info" 
                      size="small" 
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      icon={<WarningIcon />} 
                      label={`${stats.byType?.rejection || 0} Rejections`} 
                      color="error" 
                      size="small" 
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Filter Controls */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={filter}
                    label="Filter"
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Activities</MenuItem>
                    <MenuItem value="block">Blocks</MenuItem>
                    <MenuItem value="transaction">Transactions</MenuItem>
                    <MenuItem value="event">Events</MenuItem>
                    <MenuItem value="rejection">Rejections</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="gas">Gas Usage</MenuItem>
                    <MenuItem value="nonce">Nonce</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  size="small"
                  variant={autoScroll ? "contained" : "outlined"}
                  onClick={handleAutoScrollToggle}
                >
                  {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                </Button>
                
                {isUserScrolling && autoScroll && (
                  <Chip 
                    label="Scroll to bottom to resume auto-scroll" 
                    color="warning" 
                    size="small" 
                  />
                )}
              </Box>

              {/* Logs Display */}
              <Paper 
                ref={logsContainerRef}
                onScroll={handleScroll}
                sx={logsContainerStyle}
              >
                {filteredLogs.length === 0 ? (
                  <Alert severity="info">
                    No blockchain activity logged yet. Start interacting with the blockchain to see activity here.
                  </Alert>
                ) : (
                  <Box>
                    {filteredLogs.map((log) => (
                      <Box key={log.id} sx={{ mb: 2, p: 1, bgcolor: 'white', borderRadius: 1, border: 1, borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {getTypeIcon(log.type)}
                          <Chip 
                            label={log.type.toUpperCase()} 
                            color={getTypeColor(log.type)} 
                            size="small" 
                            sx={{ ml: 1, mr: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {log.timestamp.toLocaleTimeString()}
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 3 }}>
                          {formatLogContent(log)}
                        </Box>
                      </Box>
                    ))}
                    <div ref={logsEndRef} />
                  </Box>
                )}
              </Paper>

              {/* Footer */}
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Total: {filteredLogs.length} activities
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real-time blockchain monitoring active
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
    </>
  );
};

export default BlockchainActivityLogger; 
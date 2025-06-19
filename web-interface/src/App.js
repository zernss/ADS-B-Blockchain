import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import BlockchainPage from './components/BlockchainPage';
import UnprotectedPage from './components/UnprotectedPage';

function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ADS-B Flight Data Security Demo
          </Typography>
          <Button color="inherit" component={Link} to="/blockchain">Blockchain System</Button>
          <Button color="inherit" component={Link} to="/unprotected">Unprotected System</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: 4 }}>
        <Container maxWidth="xl">
          <Routes>
            <Route path="/blockchain" element={<BlockchainPage />} />
            <Route path="/unprotected" element={<UnprotectedPage />} />
            <Route path="*" element={<BlockchainPage />} />
          </Routes>
        </Container>
      </Box>
    </>
  );
}

export default App; 
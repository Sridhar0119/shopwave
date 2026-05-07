import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Badge, Box,
  InputBase, Avatar, Menu, MenuItem, Divider, Chip, useTheme,
  Drawer, List, ListItem, ListItemText, ListItemIcon, useMediaQuery
} from '@mui/material';
import {
  ShoppingCart, Search, AccountCircle, Favorite, Store,
  MenuBook, Home, ListAlt, Person, ExitToApp, Menu as MenuIcon
} from '@mui/icons-material';
import { useAuthStore, useCartStore } from '../../store';

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore(s => s.count());
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const handleSearch = e => {
    if (e.key === 'Enter' && searchQ.trim()) {
      nav(`/products?search=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ('');
    }
  };

  const navLinks = [
    { label: 'Home', path: '/', icon: <Home fontSize="small"/> },
    { label: 'Products', path: '/products', icon: <Store fontSize="small"/> },
    { label: 'Orders', path: '/orders', icon: <ListAlt fontSize="small"/>, auth: true },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Promo Banner ── */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', textAlign: 'center', py: 0.6, fontSize: '0.78rem', fontWeight: 500 }}>
        🚀 Free shipping on orders over $50 · Use code <strong>WAVE20</strong> for 20% off
      </Box>

      {/* ── AppBar ── */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', top: 0 }}>
        <Toolbar sx={{ gap: 2, px: { xs: 2, md: 4 } }}>
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)}><MenuIcon /></IconButton>
          )}

          {/* Logo */}
          <Box component={Link} to="/" sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🛍️</Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>ShopWave</Typography>
          </Box>

          {/* Search */}
          <Box sx={{ flex: 1, maxWidth: 520, mx: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'grey.100', borderRadius: 3, px: 2, py: 0.5, border: '1px solid transparent', '&:focus-within': { borderColor: 'primary.main', bgcolor: 'white' } }}>
              <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder="Search products, brands..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={handleSearch}
                sx={{ flex: 1, fontSize: '0.875rem' }}
              />
            </Box>
          </Box>

          {/* Desktop Nav */}
          {!isMobile && navLinks.filter(l => !l.auth || user).map(l => (
            <Button key={l.path} component={Link} to={l.path}
              sx={{ color: loc.pathname === l.path ? 'primary.main' : 'text.secondary', fontWeight: loc.pathname === l.path ? 700 : 500 }}>
              {l.label}
            </Button>
          ))}

          {/* Cart */}
          <IconButton component={Link} to="/cart" sx={{ color: 'text.primary' }}>
            <Badge badgeContent={cartCount} color="primary">
              <ShoppingCart />
            </Badge>
          </IconButton>

          {/* Auth */}
          {user ? (
            <>
              <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                  {user.name?.[0]?.toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { borderRadius: 3, mt: 1, minWidth: 180 } }}>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography fontWeight={600}>{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                </Box>
                <Divider />
                {[['Profile', '/profile', <Person fontSize="small"/>], ['My Orders', '/orders', <ListAlt fontSize="small"/>]].map(([label, path, icon]) => (
                  <MenuItem key={path} onClick={() => { nav(path); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2 }}>
                    {icon}<Typography fontSize="0.875rem">{label}</Typography>
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={() => { logout(); setAnchorEl(null); nav('/'); }} sx={{ gap: 1.5, py: 1.2, color: 'error.main' }}>
                  <ExitToApp fontSize="small" /><Typography fontSize="0.875rem">Sign out</Typography>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button component={Link} to="/login" variant="outlined" size="small">Login</Button>
              <Button component={Link} to="/register" variant="contained" size="small">Sign up</Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Mobile Drawer ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }}>
          <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</Box>
            <Typography fontWeight={800} fontSize="1.1rem">ShopWave</Typography>
          </Box>
          <Divider />
          <List>
            {navLinks.filter(l => !l.auth || user).map(l => (
              <ListItem key={l.path} button onClick={() => { nav(l.path); setDrawerOpen(false); }}
                selected={loc.pathname === l.path}>
                <ListItemIcon sx={{ minWidth: 36 }}>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* ── Main ── */}
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {/* ── Footer ── */}
      <Box sx={{ bgcolor: '#1e293b', color: 'rgba(255,255,255,.7)', pt: 6, pb: 3, mt: 8 }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 4 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 4, mb: 4 }}>
            <Box>
              <Typography fontWeight={800} color="white" mb={1.5}>🛍️ ShopWave</Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.8, maxWidth: 220 }}>
                Modern e-commerce built on microservices. Fast, secure, and scalable.
              </Typography>
            </Box>
            {[
              ['Shop', ['Electronics', 'Clothing', 'Books', 'Sports', 'Home']],
              ['Account', ['Login', 'Register', 'Orders', 'Profile']],
              ['Tech Stack', ['React + MUI', 'Node.js Auth', 'Python Products', 'Go Orders', 'Redis Cache']],
            ].map(([title, items]) => (
              <Box key={title}>
                <Typography fontWeight={700} color="white" mb={1.5} fontSize="0.9rem">{title}</Typography>
                {items.map(item => (
                  <Typography key={item} variant="body2" sx={{ mb: 0.5, cursor: 'pointer', '&:hover': { color: 'white' } }}>{item}</Typography>
                ))}
              </Box>
            ))}
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,.1)', mb: 2 }} />
          <Typography variant="caption" sx={{ opacity: .6, display: 'block', textAlign: 'center' }}>
            © {new Date().getFullYear()} ShopWave. Built with ❤️ using Microservices · Docker · Kubernetes · AWS
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

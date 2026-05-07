// ─── ProductDetailPage ──────────────────────────────────────────
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container, Grid, Box, Typography, Button, Rating, Chip, Divider,
  CircularProgress, IconButton, Breadcrumbs, Paper, Alert
} from '@mui/material';
import { ShoppingCart, Add, Remove, ArrowBack, Bolt } from '@mui/icons-material';
import { productAPI, authAPI, orderAPI, paymentAPI } from '../utils/api';
import { useCartStore, useAuthStore } from '../store';
import toast from 'react-hot-toast';

export function ProductDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const add = useCartStore(s => s.add);
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => productAPI.get(id).then(r => r.data) });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!p) return <Container sx={{ py: 4 }}><Alert severity="error">Product not found.</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.875rem' }}>Home</Link>
        <Link to="/products" style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.875rem' }}>Products</Link>
        <Typography fontSize="0.875rem" color="text.primary">{p.name}</Typography>
      </Breadcrumbs>

      <Grid container spacing={5} alignItems="flex-start">
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7rem', background: `hsl(${(p.id||1)*47%360},60%,93%)`, borderRadius: 4 }}>
            {p.image_emoji || '📦'}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Chip label={p.category} color="primary" size="small" sx={{ mb: 1.5, textTransform: 'capitalize' }} />
          <Typography variant="h4" fontWeight={700} mb={1}>{p.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Rating value={p.rating || 4} precision={0.5} readOnly />
            <Typography color="text.secondary" fontSize="0.875rem">({p.review_count || 0} reviews)</Typography>
          </Box>
          <Typography variant="h3" fontWeight={800} color="primary" mb={2}>${parseFloat(p.price||0).toFixed(2)}</Typography>
          <Typography color="text.secondary" lineHeight={1.8} mb={3}>{p.description}</Typography>
          <Chip
            label={p.stock > 0 ? `✓ In stock (${p.stock} available)` : '✗ Out of stock'}
            color={p.stock > 0 ? 'success' : 'error'}
            variant="outlined" sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', borderRadius: 2 }}>
              <IconButton size="small" onClick={() => setQty(q => Math.max(1, q - 1))}><Remove /></IconButton>
              <Typography sx={{ px: 2, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{qty}</Typography>
              <IconButton size="small" onClick={() => setQty(q => Math.min(p.stock, q + 1))}><Add /></IconButton>
            </Paper>
            <Button variant="contained" size="large" startIcon={<ShoppingCart />} sx={{ flex: 1 }}
              disabled={p.stock === 0}
              onClick={() => { add(p, qty); toast.success(`${qty}× ${p.name} added! 🛒`); }}>
              Add to Cart
            </Button>
          </Box>
          <Button variant="outlined" fullWidth size="large" startIcon={<Bolt />}
            onClick={() => { add(p, qty); nav('/checkout'); }}>
            Buy Now
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}
export default ProductDetailPage;

// ─── CartPage ───────────────────────────────────────────────────
import {
  Table, TableBody, TableCell, TableRow, TableHead
} from '@mui/material';
import { Delete } from '@mui/icons-material';

export function CartPage() {
  const nav = useNavigate();
  const { items, remove, setQty, clear } = useCartStore();
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (!items.length) return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', py: 12 }}>
      <Typography fontSize="4rem">🛒</Typography>
      <Typography variant="h5" fontWeight={700} mt={2} mb={1}>Your cart is empty</Typography>
      <Typography color="text.secondary" mb={3}>Add some products to get started</Typography>
      <Button variant="contained" component={Link} to="/products" size="large">Browse Products</Button>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Shopping Cart ({items.length} items)</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem', textTransform: 'uppercase' } }}>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 60, height: 60, borderRadius: 2, background: `hsl(${(item.id||1)*47%360},60%,93%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>{item.image_emoji || '📦'}</Box>
                        <Box>
                          <Typography fontWeight={600} fontSize="0.9rem">{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                          <Typography color="primary" fontWeight={700} fontSize="0.9rem">${parseFloat(item.price).toFixed(2)}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Paper variant="outlined" sx={{ display: 'inline-flex', alignItems: 'center', borderRadius: 2 }}>
                        <IconButton size="small" onClick={() => setQty(item.id, item.qty - 1)}><Remove fontSize="small"/></IconButton>
                        <Typography sx={{ px: 1.5, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{item.qty}</Typography>
                        <IconButton size="small" onClick={() => setQty(item.id, item.qty + 1)}><Add fontSize="small"/></IconButton>
                      </Paper>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700}>${(item.price * item.qty).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton color="error" size="small" onClick={() => remove(item.id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Button size="small" color="error" sx={{ mt: 1.5 }} onClick={clear}>Clear cart</Button>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2.5, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Order Summary</Typography>
            {[['Subtotal', `$${subtotal.toFixed(2)}`], ['Shipping', shipping === 0 ? '🎉 Free' : `$${shipping.toFixed(2)}`], ['Tax (8%)', `$${tax.toFixed(2)}`]].map(([l, v]) => (
              <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography color="text.secondary" fontSize="0.9rem">{l}</Typography>
                <Typography fontWeight={500} fontSize="0.9rem">{v}</Typography>
              </Box>
            ))}
            {shipping === 0 && <Typography variant="caption" color="success.main" display="block" mb={1}>✓ You qualify for free shipping!</Typography>}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography fontWeight={700} fontSize="1.05rem">Total</Typography>
              <Typography fontWeight={800} fontSize="1.25rem" color="primary">${total.toFixed(2)}</Typography>
            </Box>
            <Button fullWidth variant="contained" size="large" onClick={() => nav('/checkout')}>Proceed to Checkout →</Button>
            <Button fullWidth variant="text" component={Link} to="/products" sx={{ mt: 1 }}>Continue Shopping</Button>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

// ─── CheckoutPage ───────────────────────────────────────────────
import { Step, Stepper, StepLabel, TextField as MuiTextField } from '@mui/material';

export function CheckoutPage() {
  const nav = useNavigate();
  const { items, clear } = useCartStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ship, setShip] = useState({ name:'', email:'', address:'', city:'', state:'', zip:'' });
  const [pay, setPay] = useState({ card_number:'', expiry:'', cvv:'', card_name:'' });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingCost = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  if (!items.length) { nav('/cart'); return null; }

  async function placeOrder() {
    setLoading(true);
    try {
      const orderRes = await orderAPI.create({ shipping_address: ship, items: items.map(i => ({ product_id: i.id, quantity: i.qty, price: i.price, name: i.name })), total });
      await paymentAPI.create({ order_id: orderRes.data.id, amount: total, card_last4: pay.card_number.slice(-4), method: 'card' });
      clear();
      toast.success('Order placed! 🎉');
      nav(`/orders/${orderRes.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order failed. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={4}>Checkout</Typography>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 5 }}>
        {['Shipping', 'Payment', 'Review'].map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
      </Stepper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3 }}>
            {step === 0 && (
              <Box>
                <Typography variant="h6" fontWeight={600} mb={2.5}>Shipping Information</Typography>
                <Grid container spacing={2}>
                  {[['Full Name','name'],['Email','email'],['Address','address'],['City','city'],['State','state'],['ZIP','zip']].map(([l,k]) => (
                    <Grid item xs={12} sm={k==='address'?12:6} key={k}>
                      <MuiTextField fullWidth label={l} value={ship[k]} onChange={e => setShip(s=>({...s,[k]:e.target.value}))} size="small" />
                    </Grid>
                  ))}
                </Grid>
                <Button variant="contained" sx={{ mt: 3 }} disabled={!ship.name||!ship.email||!ship.address} onClick={() => setStep(1)}>Continue to Payment →</Button>
              </Box>
            )}
            {step === 1 && (
              <Box>
                <Typography variant="h6" fontWeight={600} mb={1.5}>Payment Details</Typography>
                <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.8rem' }}>Test: card <strong>4242 4242 4242 4242</strong>, any future date, any CVV</Alert>
                <Grid container spacing={2}>
                  {[['Cardholder Name','card_name'],['Card Number','card_number'],['Expiry (MM/YY)','expiry'],['CVV','cvv']].map(([l,k]) => (
                    <Grid item xs={12} sm={k==='card_name'||k==='card_number'?12:6} key={k}>
                      <MuiTextField fullWidth label={l} value={pay[k]} onChange={e=>setPay(p=>({...p,[k]:e.target.value}))} size="small" />
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ display:'flex', gap:1, mt:3 }}>
                  <Button variant="outlined" onClick={() => setStep(0)}>← Back</Button>
                  <Button variant="contained" disabled={!pay.card_number||!pay.expiry||!pay.cvv} onClick={() => setStep(2)}>Review Order →</Button>
                </Box>
              </Box>
            )}
            {step === 2 && (
              <Box>
                <Typography variant="h6" fontWeight={600} mb={2}>Review & Confirm</Typography>
                {[['📦 Ship to', `${ship.name} · ${ship.address}, ${ship.city}`], ['💳 Card', `•••• •••• •••• ${pay.card_number.slice(-4)||'????'}`]].map(([l,v]) => (
                  <Box key={l} sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, mb: 1.5 }}>
                    <Typography fontWeight={600} fontSize="0.85rem" mb={0.5}>{l}</Typography>
                    <Typography fontSize="0.875rem" color="text.secondary">{v}</Typography>
                  </Box>
                ))}
                <Box sx={{ display:'flex', gap:1, mt:3 }}>
                  <Button variant="outlined" onClick={() => setStep(1)}>← Back</Button>
                  <Button variant="contained" fullWidth size="large" disabled={loading} onClick={placeOrder}>
                    {loading ? <CircularProgress size={20} color="inherit"/> : `✅ Place Order — $${total.toFixed(2)}`}
                  </Button>
                </Box>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={2}>Order ({items.length} items)</Typography>
            {items.map(i => (
              <Box key={i.id} sx={{ display:'flex', justifyContent:'space-between', mb:1, fontSize:'0.875rem' }}>
                <Typography fontSize="0.875rem" color="text.secondary">{i.name} × {i.qty}</Typography>
                <Typography fontWeight={600} fontSize="0.875rem">${(i.price*i.qty).toFixed(2)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
            {[['Subtotal',`$${subtotal.toFixed(2)}`],['Shipping',shippingCost===0?'Free':`$${shippingCost.toFixed(2)}`],['Tax',`$${tax.toFixed(2)}`]].map(([l,v]) => (
              <Box key={l} sx={{ display:'flex', justifyContent:'space-between', mb:1 }}>
                <Typography fontSize="0.85rem" color="text.secondary">{l}</Typography>
                <Typography fontSize="0.85rem">{v}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display:'flex', justifyContent:'space-between' }}>
              <Typography fontWeight={700}>Total</Typography>
              <Typography fontWeight={800} color="primary" fontSize="1.15rem">${total.toFixed(2)}</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

// ─── LoginPage ──────────────────────────────────────────────────
export function LoginPage() {
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const r = await authAPI.login(form);
      setAuth(r.data.user, r.data.token);
      toast.success(`Welcome back, ${r.data.user.name}! 👋`);
      nav('/');
    } catch(err) { toast.error(err.response?.data?.error || 'Invalid credentials'); }
    finally { setLoading(false); }
  }

  return (
    <Box sx={{ minHeight: '80vh', display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'grey.50', p:2 }}>
      <Card sx={{ width:'100%', maxWidth:420, p:4 }}>
        <Box sx={{ textAlign:'center', mb:3 }}>
          <Box sx={{ width:56, height:56, bgcolor:'primary.main', borderRadius:3, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', mb:2 }}>🛍️</Box>
          <Typography variant="h5" fontWeight={700}>Welcome back</Typography>
          <Typography color="text.secondary" fontSize="0.9rem">Sign in to your ShopWave account</Typography>
        </Box>
        <Box component="form" onSubmit={submit} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <MuiTextField fullWidth label="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
          <MuiTextField fullWidth label="Password" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit"/> : 'Sign in →'}
          </Button>
        </Box>
        <Alert severity="info" sx={{ mt: 2, fontSize:'0.78rem' }}>Demo: <strong>demo@shopwave.com</strong> / <strong>demo123</strong></Alert>
        <Typography textAlign="center" mt={2} fontSize="0.875rem" color="text.secondary">
          No account? <Link to="/register" style={{ color:'#6366f1', fontWeight:600 }}>Sign up</Link>
        </Typography>
      </Card>
    </Box>
  );
}

// ─── RegisterPage ────────────────────────────────────────────────
export function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authAPI.register({ name:form.name, email:form.email, password:form.password });
      const r = await authAPI.login({ email:form.email, password:form.password });
      setAuth(r.data.user, r.data.token);
      toast.success('Account created! 🎉');
      nav('/');
    } catch(err) { toast.error(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <Box sx={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'grey.50', p:2 }}>
      <Card sx={{ width:'100%', maxWidth:440, p:4 }}>
        <Box sx={{ textAlign:'center', mb:3 }}>
          <Box sx={{ width:56, height:56, bgcolor:'primary.main', borderRadius:3, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', mb:2 }}>✨</Box>
          <Typography variant="h5" fontWeight={700}>Create account</Typography>
          <Typography color="text.secondary" fontSize="0.9rem">Join ShopWave today</Typography>
        </Box>
        <Box component="form" onSubmit={submit} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          {[['Full Name','name','text'],['Email','email','email'],['Password','password','password'],['Confirm Password','confirm','password']].map(([l,k,t]) => (
            <MuiTextField key={k} fullWidth label={l} type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} required />
          ))}
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit"/> : 'Create Account →'}
          </Button>
        </Box>
        <Typography textAlign="center" mt={2} fontSize="0.875rem" color="text.secondary">
          Have an account? <Link to="/login" style={{ color:'#6366f1', fontWeight:600 }}>Sign in</Link>
        </Typography>
      </Card>
    </Box>
  );
}

// ─── OrdersPage ─────────────────────────────────────────────────
const STATUS_COLOR = { pending:'warning', confirmed:'info', processing:'info', shipped:'secondary', delivered:'success', cancelled:'error' };

export function OrdersPage() {
  const nav = useNavigate();
  const { data: orders, isLoading } = useQuery({ queryKey:['orders'], queryFn:()=>orderAPI.list().then(r=>r.data) });

  if (isLoading) return <Box sx={{ display:'flex', justifyContent:'center', py:10 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ py:4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>My Orders</Typography>
      {(!orders?.length) ? (
        <Box sx={{ textAlign:'center', py:10 }}>
          <Typography fontSize="3rem">📦</Typography>
          <Typography variant="h6" fontWeight={600} mt={2} mb={1}>No orders yet</Typography>
          <Typography color="text.secondary" mb={3}>Start shopping to see your orders here</Typography>
          <Button variant="contained" component={Link} to="/products">Browse Products</Button>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {orders.map(order => (
            <Card key={order.id} sx={{ p:2.5, cursor:'pointer', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,.1)' } }} onClick={()=>nav(`/orders/${order.id}`)}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <Box>
                  <Typography fontWeight={700}>Order #{order.id}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.items?.length || 0} items · {new Date(order.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
                  <Chip label={order.status} color={STATUS_COLOR[order.status]||'default'} size="small" />
                  <Typography fontWeight={700} color="primary">${parseFloat(order.total||0).toFixed(2)}</Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}

// ─── OrderDetailPage ─────────────────────────────────────────────
const ORDER_STEPS = ['pending','confirmed','processing','shipped','delivered'];

export function OrderDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: order, isLoading } = useQuery({ queryKey:['order',id], queryFn:()=>orderAPI.get(id).then(r=>r.data) });

  if (isLoading) return <Box sx={{ display:'flex', justifyContent:'center', py:10 }}><CircularProgress /></Box>;
  if (!order) return <Container sx={{ py:4 }}><Alert severity="error">Order not found.</Alert></Container>;

  const currentStep = ORDER_STEPS.indexOf(order.status);

  return (
    <Container maxWidth="md" sx={{ py:4 }}>
      <Button startIcon={<ArrowBack />} onClick={()=>nav('/orders')} sx={{ mb:2 }}>My Orders</Button>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Order #{order.id}</Typography>
          <Typography color="text.secondary">Placed {new Date(order.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</Typography>
        </Box>
        <Chip label={order.status} color={STATUS_COLOR[order.status]||'default'} />
      </Box>

      {order.status !== 'cancelled' && (
        <Card sx={{ p:3, mb:3 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {ORDER_STEPS.map(s => <Step key={s}><StepLabel sx={{ textTransform:'capitalize' }}>{s}</StepLabel></Step>)}
          </Stepper>
        </Card>
      )}

      <Card sx={{ p:3, mb:2 }}>
        <Typography fontWeight={700} mb={2}>Items</Typography>
        {(order.items||[]).map((item,i) => (
          <Box key={i} sx={{ display:'flex', justifyContent:'space-between', py:1, borderBottom: i<order.items.length-1?'1px solid':'none', borderColor:'divider' }}>
            <Typography fontSize="0.9rem">{item.name} <Typography component="span" color="text.secondary">× {item.quantity}</Typography></Typography>
            <Typography fontWeight={600}>${(item.price*item.quantity).toFixed(2)}</Typography>
          </Box>
        ))}
        <Box sx={{ display:'flex', justifyContent:'space-between', pt:2, mt:1 }}>
          <Typography fontWeight={700}>Total</Typography>
          <Typography fontWeight={800} color="primary" fontSize="1.1rem">${parseFloat(order.total||0).toFixed(2)}</Typography>
        </Box>
      </Card>

      {order.shipping_address && (
        <Card sx={{ p:3 }}>
          <Typography fontWeight={700} mb={1.5}>Shipping Address</Typography>
          <Typography color="text.secondary" lineHeight={1.8}>
            {order.shipping_address.name}<br/>
            {order.shipping_address.address}<br/>
            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
          </Typography>
        </Card>
      )}
    </Container>
  );
}

// ─── ProfilePage ─────────────────────────────────────────────────
export function ProfilePage() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  return (
    <Container maxWidth="sm" sx={{ py:4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>My Profile</Typography>
      <Card sx={{ p:3 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:2.5, mb:3 }}>
          <Box sx={{ width:72, height:72, bgcolor:'primary.main', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'1.75rem', fontWeight:700 }}>
            {user?.name?.[0]?.toUpperCase()||'?'}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>{user?.name}</Typography>
            <Typography color="text.secondary" fontSize="0.875rem">{user?.email}</Typography>
            <Chip label="Member" color="primary" size="small" sx={{ mt:0.5 }} />
          </Box>
        </Box>
        <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap' }}>
          <Button variant="outlined" startIcon={<ListAlt />} onClick={()=>nav('/orders')}>My Orders</Button>
          <Button variant="outlined" color="error" startIcon={<ExitToApp />} onClick={()=>{ logout(); nav('/'); }}>Sign Out</Button>
        </Box>
      </Card>
    </Container>
  );
}

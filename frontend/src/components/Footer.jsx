import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Send } from 'lucide-react';
import './Footer.css';

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const YoutubeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.63 1.433h.005c6.551 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);

const Footer = () => {
  return (
    <footer className="main-footer glass-dark">
      <div className="container">
        <div className="footer-top">
          <div className="footer-branding">
            <div className="footer-logo">M C <span>Stays</span></div>
            <p>Your stay journey with us has just begun. Explore our luxury stays and experience comfort, style, and the lifestyle you deserve!</p>
            <div className="social-stack">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="instagram"><InstagramIcon /></a>
              <a href="https://www.youtube.com/@amitsomvanshii" target="_blank" rel="noreferrer" className="youtube"><YoutubeIcon /></a>
              <a href="https://x.com/amitsomvanshii" target="_blank" rel="noreferrer" className="twitter"><XIcon /></a>
              <a href="https://wa.me/916387037528" target="_blank" rel="noreferrer" className="whatsapp"><WhatsAppIcon /></a>
            </div>
          </div>

          <div className="footer-links-grid">
            <div className="link-col">
              <h4>Join us</h4>
              <Link to="/company/about">About Us</Link>
              <Link to="/search?city=Pune">Pune</Link>
              <Link to="/search?city=Gurgaon">Gurgaon</Link>
              <Link to="/search?city=Bangalore">Bangalore</Link>
              <Link to="/company/growth-lab">Growth Lab</Link>
            </div>
            <div className="link-col">
              <h4>Properties</h4>
              <Link to="/company/jobs">Careers</Link>
              <Link to="/company/gates">M C Stays Gates</Link>
              <Link to="/company/suites">M C Stays Suites</Link>
              <Link to="/company/blog">Our Blog</Link>
            </div>
            <div className="link-col">
              <h4>Legal</h4>
              <Link to="/legal/privacy">Privacy Policy</Link>
              <Link to="/legal/cookies">Cookie Policy</Link>
              <Link to="/legal/terms">Terms and Conditions</Link>
              <Link to="/legal/disclaimer">Disclaimer</Link>
            </div>
          </div>
        </div>

        <div className="footer-contact-row glass">
          <div className="contact-item">
            <Phone size={18} />
            <div>
              <p className="label">Customer Support</p>
              <a href="tel:+91 6387037528">+91 6387037528</a>
              <a href="mailto:amitsomvanshi63@gmail.com" className="email-link">amitsomvanshi63@gmail.com</a>
            </div>
          </div>
          <div className="contact-item">
            <Send size={18} />
            <div>
              <p className="label">Enquiries</p>
              <a href="tel:+91 6387037528">+91 6387037528</a>
              <a href="mailto:amitsomvanshi63@gmail.com" className="email-link">amitsomvanshi63@gmail.com</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Copyright © 2026, First Main Character Stays Private Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

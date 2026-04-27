import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Lock, FileText, AlertCircle, ChevronLeft, Fingerprint, Eye, Database, Gavel } from 'lucide-react';
import './Legal.css';

const Legal = () => {
  const { section } = useParams();
  const contentRef = React.useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const offset = 100;
      const elementPosition = contentRef.current.offsetTop;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [section]);

  const sections = {
    privacy: {
      title: 'Privacy Policy',
      icon: <Lock size={24} />,
      content: (
        <div className="legal-content-wrapper">
          <div className="info-card indigo-gradient">
            <div className="card-icon"><Eye size={32} /></div>
            <p className="last-updated">Last updated: April 18, 2026</p>
            <h3>Our Commitment to Privacy</h3>
            <p>At M C Stays, accessible from mcstays.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by M C Stays and how we use it.</p>
          </div>
          
          <div className="info-card blue-gradient">
            <div className="card-icon"><Fingerprint size={32} /></div>
            <h3>1. Information We Collect</h3>
            <p>We collect information you provide directly to us when you create an account, make a booking, or communicate with us. This includes:</p>
            <ul className="legal-list">
              <li>Name, email address, and phone number.</li>
              <li>Government-issued identification (for verification).</li>
              <li>Booking and payment history.</li>
              <li>Preferences for your stay.</li>
            </ul>
          </div>

          <div className="info-card purple-gradient">
            <div className="card-icon"><Database size={32} /></div>
            <h3>2. How We Use Your Information</h3>
            <p>We use the information we collect in various ways, including to provide, operate, and maintain our platform, as well as to detect and prevent fraud through our AI security layers.</p>
          </div>
        </div>
      )
    },
    terms: {
      title: 'Terms and Conditions',
      icon: <FileText size={24} />,
      content: (
        <div className="legal-content-wrapper">
          <div className="info-card blue-gradient">
            <div className="card-icon"><Gavel size={32} /></div>
            <h3>Agreement to Terms</h3>
            <p>Welcome to M C Stays! These terms and conditions outline the rules and regulations for the use of M C Stays' Website and services.</p>
          </div>

          <div className="info-card indigo-gradient">
            <h3>1. Booking and Cancellation</h3>
            <p>By making a booking through our platform, you agree to the specific house rules of the selected PG property. Cancellations are subject to our standard policy which ensures fairness for both residents and owners.</p>
          </div>

          <div className="info-card purple-gradient">
            <h3>2. Digital Agreements</h3>
            <p>All rental agreements generated on M C Stays are legally binding when signed digitally by both the resident and the property owner through our secure platform.</p>
          </div>
        </div>
      )
    },
    cookies: {
      title: 'Cookie Policy',
      icon: <Shield size={24} />,
      content: (
        <div className="legal-content-wrapper">
          <div className="info-card teal-gradient">
            <div className="card-icon"><Shield size={32} /></div>
            <h3>Cookie Usage</h3>
            <p>M C Stays uses cookies, which are tiny files that are downloaded to your computer, to improve your experience and provide better AI recommendations.</p>
          </div>

          <div className="info-card cyan-gradient">
            <h3>Managing Cookies</h3>
            <p>You can prevent the setting of cookies by adjusting the settings on your browser. Note that disabling cookies will affect the functionality of our platform.</p>
          </div>
        </div>
      )
    },
    disclaimer: {
      title: 'Disclaimer',
      icon: <AlertCircle size={24} />,
      content: (
        <div className="legal-content-wrapper">
          <div className="info-card magenta-gradient">
            <div className="card-icon"><AlertCircle size={32} /></div>
            <h3>General Disclaimer</h3>
            <p>The information provided by M C Stays is for general informational purposes only. While we strive for accuracy, property descriptions and photos may vary.</p>
          </div>

          <div className="info-card purple-gradient">
            <h3>AI Recommendations</h3>
            <p>Our AI-driven suggestions are intended as helpful guides based on your preferences and do not guarantee a perfect fit for every individual.</p>
          </div>
        </div>
      )
    }
  };

  const activeSection = sections[section] || sections.privacy;

  return (
    <div className="legal-container fade-in">
      <div className="legal-header">
        <div className="container">
          <Link to="/" className="back-link">
            <ChevronLeft size={20} /> Back to Home
          </Link>
          <h1>Legal Documentation</h1>
          <p>Everything you need to know about our policies and terms.</p>
        </div>
      </div>

      <div className="container">
        <div className="legal-layout" ref={contentRef}>
          <aside className="legal-sidebar glass">
            <div className="sidebar-group-title">POLICIES</div>
            {Object.keys(sections).map((key) => (
              <Link 
                key={key} 
                to={`/legal/${key}`} 
                className={`sidebar-item ${section === key ? 'active' : ''}`}
              >
                {sections[key].icon}
                <span>{sections[key].title}</span>
              </Link>
            ))}
          </aside>

          <main className="legal-content-area">
            <div className="content-intro fade-in" key={section}>
              <div className="intro-badge">
                {activeSection.icon} <span>{activeSection.title}</span>
              </div>
              <h2>{activeSection.title}</h2>
            </div>
            {activeSection.content}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Legal;

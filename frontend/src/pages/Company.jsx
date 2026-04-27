import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Info, Briefcase, Rocket, Star, Layout, Newspaper, ChevronLeft, Target, History, Users, Gift, ShieldCheck } from 'lucide-react';
import './Company.css';

const Company = () => {
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
    about: {
      title: 'About Us',
      icon: <Info size={24} />,
      content: (
        <div className="company-content-wrapper">
          <div className="info-card purple-gradient">
            <div className="card-icon"><Target size={32} /></div>
            <h3>Our Mission</h3>
            <p>M C Stays is India's leading AI-powered hostel and PG finder platform. We are dedicated to providing students and office professionals with a seamless, secure, and smart accommodation experience.</p>
          </div>
          
          <div className="info-card blue-gradient">
            <div className="card-icon"><History size={32} /></div>
            <h3>Our Story</h3>
            <p>Founded in 2026, M C Stays started with a simple goal: to bring transparency to the residential rental market. Today, we manage thousands of beds across India's major IT hubs, ensuring every resident experiences the "Main Character" lifestyle they deserve.</p>
          </div>

          <div className="info-card teal-gradient">
            <div className="card-icon"><Users size={32} /></div>
            <h3>Our Values</h3>
            <div className="values-grid">
              <div className="value-item">Transparency</div>
              <div className="value-item">Security</div>
              <div className="value-item">Innovation</div>
              <div className="value-item">Community</div>
            </div>
          </div>
        </div>
      )
    },
    'growth-lab': {
      title: 'Growth Lab',
      icon: <Rocket size={24} />,
      content: (
        <div className="company-content-wrapper">
          <div className="info-card indigo-gradient">
            <div className="card-icon"><Rocket size={32} /></div>
            <h3>Innovation & Partnerships</h3>
            <p>M C Stays Growth Lab is where we innovate for the future of urban living. We work with real estate developers and property owners to optimize their assets using our proprietary yield management systems.</p>
          </div>

          <div className="info-card blue-gradient">
            <div className="card-icon"><Layout size={32} /></div>
            <h3>AI Optimization</h3>
            <p>The Growth Lab is responsible for our national expansion and the development of our AI Recommendation Engine, which uses predictive modeling to find your perfect vibe.</p>
          </div>
        </div>
      )
    },
    jobs: {
      title: 'Careers',
      icon: <Briefcase size={24} />,
      content: (
        <div className="company-content-wrapper">
          <div className="info-card teal-gradient">
            <div className="card-icon"><Briefcase size={32} /></div>
            <h3>Join the Revolution</h3>
            <p>Build the future of PropTech. At M C Stays, we value innovation, speed, and empathy. Our teams work on world-class IoT and AI systems for the modern resident.</p>
          </div>

          <div className="info-card emerald-gradient">
            <h3>Open Positions</h3>
            <div className="job-list">
              <div className="job-card glass">
                <h4>Full Stack Developer</h4>
                <span>Remote / Bangalore</span>
              </div>
              <div className="job-card glass">
                <h4>AI/ML Engineer</h4>
                <span>Pune</span>
              </div>
              <div className="job-card glass">
                <h4>Concierge Manager</h4>
                <span>Multiple Locations</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    gates: {
      title: 'M C Stays Gates',
      icon: <Star size={24} />,
      content: (
        <div className="company-content-wrapper">
          <div className="info-card gold-gradient">
            <div className="card-icon"><Star size={32} /></div>
            <h3>The Luxury Tier</h3>
            <p>Discover M C Stays Gates – Our premium segment of co-living spaces. Featuring premium interiors, dedicated housekeeping, and exclusive access to fitness centers and co-working lounges.</p>
          </div>

          <div className="info-card royal-gradient">
            <div className="card-icon"><Gift size={32} /></div>
            <h3>Exclusive Amenities</h3>
            <div className="amenities-grid-premium">
              <div className="amenity-pill glass">Smart Home Integration</div>
              <div className="amenity-pill glass">Gourmet Meal Plans</div>
              <div className="amenity-pill glass">Weekly Community Events</div>
              <div className="amenity-pill glass">24/7 Concierge Support</div>
            </div>
          </div>
        </div>
      )
    },
    suites: {
      title: 'M C Stays Suites',
      icon: <Layout size={24} />,
      content: (
        <div className="company-content-wrapper">
          <div className="info-card magenta-gradient">
            <div className="card-icon"><Layout size={32} /></div>
            <h3>Independent Living</h3>
            <p>M C Stays Suites – Your private sanctuary. Fully furnished studio apartments with private kitchenettes and bathrooms for total independence.</p>
          </div>

          <div className="info-card cyan-gradient">
            <div className="card-icon"><ShieldCheck size={32} /></div>
            <h3>Modern Comforts</h3>
            <p>Every Suite is equipped with high-speed fiber internet, premium furniture, and all-inclusive utilities for a completely hassle-free move-in.</p>
          </div>
        </div>
      )
    },
    blog: {
      title: 'Our Blog',
      icon: <Newspaper size={24} />,
      content: (
        <div className="company-content-wrapper">
          <div className="blog-container">
            {[
              { t: '5 Tips for Moving to a New City', d: 'Everything you need to pack for your first month.', c: 'purple' },
              { t: 'Mastering Work-Life Balance', d: 'How our co-working spaces help you stay productive.', c: 'blue' },
              { t: 'Sustainability in Urban Stays', d: 'How we\'re reducing our carbon footprint.', c: 'teal' }
            ].map((post, i) => (
              <div key={i} className={`blog-post-card info-card ${post.c}-gradient`}>
                <h4>{post.t}</h4>
                <p>{post.d}</p>
                <button className="btn-text">Read More →</button>
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  const activeSection = sections[section] || sections.about;

  return (
    <div className="company-container fade-in">
      <div className="company-header">
        <div className="container">
          <Link to="/" className="back-link">
            <ChevronLeft size={20} /> Back to Home
          </Link>
          <h1>Company Information</h1>
          <p>Learn more about our vision, culture, and the lifestyle we build.</p>
        </div>
      </div>

      <div className="container">
        <div className="company-layout" ref={contentRef}>
          <aside className="company-sidebar glass">
            <div className="sidebar-group-title">EXPLORE</div>
            {Object.keys(sections).map((key) => (
              <Link 
                key={key} 
                to={`/company/${key}`} 
                className={`sidebar-item ${section === key ? 'active' : ''}`}
              >
                {sections[key].icon}
                <span>{sections[key].title}</span>
              </Link>
            ))}
          </aside>

          <main className="company-content-area">
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

export default Company;

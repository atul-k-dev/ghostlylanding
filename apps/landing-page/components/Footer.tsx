import React from "react";

const SanjayaLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" stroke="white" strokeWidth="1.5" />
    <path d="M8 8V16L16 8V16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const TwitterXIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export function Footer() {
  return (
    <footer className="w-full   text-fg pt-14 sm:pt-20 pb-8 px-4 sm:px-6 md:px-10 font-sans ">
      <div className="mx-auto max-w-[1400px] flex flex-col md:flex-row justify-between">
        
        {/* Left Side */}
        <div className="flex flex-col w-full md:w-1/2 md:pr-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            
            <span className="text-[26px] font-medium tracking-tight">CasperAI</span>
          </div>

          {/* Heading */}
          <h2 className="text-[32px] sm:text-[44px] md:text-[54px] leading-[1.05] font-medium tracking-tight mb-8 sm:mb-12">
            Get your nights <br /> back to work.
          </h2>

          {/* Abstract Image */}
          <div className="w-full max-w-[220px] mt-4 relative hidden sm:flex">
            <img 
              src="/logo.png" 
              alt="Casper AI" 
              className="w-42 h-auto object-cover opacity-80  rounded-lg"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex flex-col w-full md:w-1/2 justify-between mt-14 sm:mt-20 md:mt-0 md:pl-16 lg:pl-20">
          
          {/* Top Links and Contact area */}
          <div className="flex flex-col sm:flex-row justify-between">
            {/* Navigation */}
            <div className="flex flex-col mb-16 sm:mb-0">
              <h4 className="text-[10px] font-bold tracking-widest text-[#666666] uppercase mb-6">
                Navigation
              </h4>
              <ul className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-1 sm:gap-5">
                {[
                  { label: 'Home', href: '#' },
                  { label: 'Features', href: '#features' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'Compare', href: '#comparison' },
                  { label: 'Testimonials', href: '#testimonials' },
                  { label: 'FAQ', href: '#faq' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-[14.5px] font-medium text-[#e5e5e5] hover:text-fg transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Newsletter */}
            <div className="flex flex-col">
              
              {/* Socials */}
              <div className="mb-10">
                <h4 className="text-[10px] font-bold tracking-widest text-[#666666] uppercase mb-4">
                  Socials
                </h4>
                <div className="flex gap-2">
                  <a href="#" className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#111111] border border-border hover:bg-[#222] transition-colors">
                    <FacebookIcon />
                  </a>
                  <a href="#" className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#111111] border border-border hover:bg-[#222] transition-colors">
                    <TwitterXIcon />
                  </a>
                  <a href="#" className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#111111] border border-border hover:bg-[#222] transition-colors">
                    <InstagramIcon />
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="mb-8">
                <h4 className="text-[10px] font-bold tracking-widest text-[#666666] uppercase mb-3">
                  Email
                </h4>
                <a href="mailto:hello@casperai.com" className="text-[20px] sm:text-[26px] font-medium text-fg hover:text-muted-fg transition-colors break-all sm:break-normal">
                  hello@casperai.com
                </a>
              </div>

              {/* Twitter */}
              <div className="mb-14">
                <h4 className="text-[10px] font-bold tracking-widest text-[#666666] uppercase mb-3">
                  Follow Us
                </h4>
                <a href="https://x.com/casperai" target="_blank" rel="noopener noreferrer" className="text-[16px] font-medium text-[#e5e5e5] hover:text-fg transition-colors">
                  @casperai on X
                </a>
              </div>

              {/* Newsletter */}
              <div>
                <h4 className="text-[10px] font-bold tracking-widest text-[#666666] uppercase mb-4">
                  Subscribe for updates
                </h4>
                <form className="flex items-center bg-card rounded-lg border border-border p-1.5 w-full max-w-[340px]">
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    className="bg-transparent border-none outline-none text-fg text-[13px] font-medium pl-4 pr-2 w-full placeholder:text-[#666666]"
                    required
                  />
                  <button 
                    type="submit" 
                    className="bg-white text-black text-[13.5px] font-medium px-5 py-2.5 rounded-md hover:bg-gray-200 transition-colors flex-shrink-0"
                  >
                    Submit
                  </button>
                </form>
              </div>

            </div>
          </div>
          
          {/* Bottom Watermark Bar - Now constrained to the right side */}
          <div className="w-full border-t border-border mt-14 sm:mt-20 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <p className="text-[11px] font-semibold tracking-[0.15em] text-[#666666] uppercase">
              © 2026 CASPERAI. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center text-[11px] font-semibold tracking-[0.15em] text-[#666666] uppercase">
              MADE BY 
              <a href="https://www.buildstory.studio/" target="_blank" rel="noopener noreferrer" className="text-fg ml-4 text-[15px] tracking-normal flex items-center font-bold hover:text-muted-fg transition-colors">
                BuildStory
              </a>
            </div>
          </div>
          
        </div>
      </div>
    </footer>
  );
}

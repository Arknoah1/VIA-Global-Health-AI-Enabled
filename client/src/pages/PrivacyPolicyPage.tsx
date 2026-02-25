import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-slate prose-lg">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2" data-testid="heading-privacy-policy">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 mb-8" data-testid="text-last-updated">
              Last updated: 4/18/2020
            </p>

            <section className="mb-8" data-testid="section-privacy-intro">
              <p className="text-slate-700 leading-relaxed">
                The VIA Global Health Platform www.viaglobalhealth.com and our affiliate sites www.viaglobalhealth.co.za, www.nasg-africa.com, www.nasg-india.com is an electronic commerce platform used by business entities to facilitate international commerce. VIA knows that you care how information about you is used and shared, and we appreciate your trust that we will do so carefully and sensibly. This notice describes our Privacy Policy and tells you what personally identifiable information (PII) we may collect from you, how we may share your PII, and how you can limit our sharing of your PII.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                By visiting www.viaglobalhealth.com or any of our affiliate sites you are accepting the practices described in this Privacy Policy.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                Generally, you control the amount and type of information you provide to us when using the VIA Global Health Platform. As a visitor to our site, you can browse the products available, and are not required to provide us with any personal information.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                However, if you register as a VIA Verified Buyer or request additional product information through the VIA Global Health Platform, you must provide personally identifiable information in order for us to provide you with various features and/or functionality.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                Personally Identifiable Information (PII) is defined by US privacy law and information security, as information that can be used on its own or with other information to identify, contact, or locate a single person, or to identify an individual in context.
              </p>
            </section>

            <section className="mb-8" data-testid="section-pii-gathered">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">What personal information does VIA gather from visitors and customers?</h2>
              <p className="text-slate-700 leading-relaxed">
                The information we learn from customers helps us personalize and continually improve your VIA experience. Here are the types of information we gather.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Information You Give Us:</h3>
              <p className="text-slate-700 leading-relaxed">
                We receive and store any information you enter on our Web site or give us in any other way. When requesting additional information, ordering or registering on our site, as appropriate, you may be asked to enter your name, email address, mailing address, employer affiliation, phone number, payment information, or other details to help you with your experience. If you are a VIA Verified Buyer, VIA may collect data provided through our site, further including but not limited to your product offerings, pricing, sales, delivery information, any trade dispute records, and marketing initiatives. You can choose not to provide certain information, but then you might not be able to take advantage of many of our features. We use the information that you provide for such purposes as responding to your requests, customizing future interactions for you, improving our store, and communicating with you.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Automatic Information:</h3>
              <p className="text-slate-700 leading-relaxed">
                We receive and store certain types of information whenever you interact with us. For example, like many Web sites, we use "cookies," and we obtain certain types of information when your Web browser accesses viaglobalhealth.com domains.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">E-mail Communications:</h3>
              <p className="text-slate-700 leading-relaxed">
                To help us make e-mails more useful and interesting, we use "web beacons" and often receive a confirmation when you open e-mail from VIA if your computer supports such capabilities.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Information from Other Sources:</h3>
              <p className="text-slate-700 leading-relaxed">
                We might receive information about you from other sources and add it to our account information, such as information about our users and prospective users during trade shows, industry events and other functions.
              </p>
            </section>

            <section className="mb-8" data-testid="section-pii-used">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">How does VIA use PII?</h2>
              <p className="text-slate-700 leading-relaxed">
                If you provide any Personal Data to us, you are deemed to have authorized us to collect, retain and use that Personal Data for the following purposes:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2 text-slate-700">
                <li>Verifying your identity.</li>
                <li>Verifying your eligibility to register as a user of the VIA Global Health Platform.</li>
                <li>Processing your registration as a user, providing you with a log-in ID for the site and maintaining and managing your registration.</li>
                <li>Providing you with customer service and responding to your queries, feedback, claims or disputes.</li>
                <li>To facilitate communication between buyers and sellers on the VIA Global Health Platform.</li>
                <li>Performing research or statistical analysis in order to improve the content and layout of the VIA Global Health Platform, to improve our product offerings and services and for marketing and promotional purposes.</li>
                <li>Subject to obtaining your consent in such form as may be required under the applicable law, we may use your name, phone number, business address, and email address to provide notices, surveys, product alerts, communications and other marketing materials to you relating to goods and services offered by our partners through the VIA Global Health Platform.</li>
                <li>If you voluntarily submit any information to VIA for publication on the site through the publishing tools, including but not limited to, Company Profile, Product Catalog, Product Information and any discussion forum, then you are deemed to have given consent to the publication of such information on the site.</li>
              </ul>
            </section>

            <section className="mb-8" data-testid="section-cookies">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Does VIA use Cookies and Web Beacons?</h2>
              <p className="text-slate-700 leading-relaxed">
                Yes, VIA does use Cookies and Web Beacons. Further information about these technologies is provided below.
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2 text-slate-700">
                <li>Cookies are unique identifiers that we transfer to your device to enable our systems to recognize your device and to provide features such as storage of items in your Shopping Cart between visits.</li>
                <li>Web Beacons or Pixel Tracking is a technology to collect general information about your use of our site and your use of special promotions or newsletters. This information allows us to statistically monitor the number of people that open our emails. Our Web Beacons are not used to track your activity outside our site.</li>
                <li>The Help feature on most browsers will tell you how to prevent your browser from accepting new cookies, how to have the browser notify you when you receive a new cookie, or how to disable cookies altogether. Because cookies allow you to take advantage of some of VIA's essential features, we recommend that you leave them turned on. If you turn off cookies, some features will be disabled that make your site experience more efficient and some of our services will not function properly.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">At VIA we use cookies to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2 text-slate-700">
                <li>Help remember and process the items in the shopping cart.</li>
                <li>Understand and save user's preferences for future visits.</li>
                <li>Compile aggregate data about site traffic and site interactions in order to offer better site experiences and tools in the future. We may also use trusted third party services that track this information on our behalf.</li>
              </ul>
            </section>

            <section className="mb-8" data-testid="section-sharing">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Does VIA share the information it receives?</h2>
              <p className="text-slate-700 leading-relaxed">
                Customer information is a critical part of our business, and we are not in the business of selling it to others. We share customer information only as described below.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Affiliated Businesses We Do Not Control:</h3>
              <p className="text-slate-700 leading-relaxed">
                We work closely with affiliated businesses. In some cases, such as VIA Verified Sellers, these businesses sell offerings to you at viaglobalhealth.com and on our affiliate sites. You can tell when a third party is involved in your transactions, and we share limited customer information related to those transactions with that third party.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Third-Party Service Providers:</h3>
              <p className="text-slate-700 leading-relaxed">
                We employ other companies and individuals to perform functions on our behalf. Examples include verifying user identity and shipping addresses, providing marketing assistance, providing search results and links (including paid listings and links), and processing payments information. They have access to personal information needed to perform their functions, but may not use it for other purposes.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Promotional Offers:</h3>
              <p className="text-slate-700 leading-relaxed">
                We may send offers and updates to selected groups of VIA customers on behalf of other businesses and partners. When we do this, we do not give that business your name and address. If you do not want to receive such offers, please contact us using the Contact Us information found on our site or information listed at the bottom of email correspondences.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Business Transfers:</h3>
              <p className="text-slate-700 leading-relaxed">
                If our business is acquired or merges, in whole or in part, with another business that would become responsible for providing the site to you, we retain the right to transfer your PII to the new business. The new business would retain the right to use your PII according to the terms of this Privacy Policy as well as to any changes to this Privacy Policy as instituted by the new business.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Protection of VIA Global Health and Others:</h3>
              <p className="text-slate-700 leading-relaxed">
                We release account and other personal information when we believe release is appropriate to comply with the law; enforce or apply our site Terms and Conditions and other agreements; or protect the rights, property, or safety of VIA Global Health, our users, or others. This includes exchanging information with other companies and organizations for fraud protection and credit risk reduction. Obviously, however, this does not include selling, renting, sharing, or otherwise disclosing personally identifiable information from customers for commercial purposes in violation of the commitments set forth in this Privacy Policy.
              </p>
              <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">With Your Consent:</h3>
              <p className="text-slate-700 leading-relaxed">
                Other than as set out above, you will receive notice when information about you might go to third parties, and you will have an opportunity to choose not to share the information.
              </p>
            </section>

            <section className="mb-8" data-testid="section-protection">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">How does VIA protect visitor information?</h2>
              <p className="text-slate-700 leading-relaxed">
                Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential. In addition, all sensitive/credit information you supply is encrypted via Secure Socket Layer (SSL) technology.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                We implement a variety of security measures when a user enters, submits, or accesses their information to maintain the safety of your personal information.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                All transactions are processed through a gateway provider and are not stored or processed on our servers.
              </p>
            </section>

            <section className="mb-8" data-testid="section-third-party">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Third party links on the VIA Global Health Platform</h2>
              <p className="text-slate-700 leading-relaxed">
                As an e-commerce site we include third party products or services on our website. These third party sites have separate and independent privacy policies. We therefore have no responsibility or liability for the content and activities of these linked sites. Nonetheless, we seek to protect the integrity of our site and welcome any feedback about these sites.
              </p>
            </section>

            <section className="mb-8" data-testid="section-changing-info">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changing Your Information on VIA</h2>
              <p className="text-slate-700 leading-relaxed">
                You may change your PII at any time using facilities found on the VIA site. If at any time you would like to unsubscribe from receiving future emails, you can follow the instructions at the bottom of each email and we will promptly remove you from ALL correspondence.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                If you need assistance with updating your PII or removing yourself from our mailing lists, please send us an email with your request or contact us using the Contact us link found on our site.
              </p>
            </section>

            <section className="mb-8" data-testid="section-coppa">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">COPPA (Children Online Privacy Protection Act)</h2>
              <p className="text-slate-700 leading-relaxed">
                When it comes to the collection of personal information from children under 13, the Children's Online Privacy Protection Act (COPPA) puts parents in control. The Federal Trade Commission, the nation's consumer protection agency, enforces the COPPA Rule, which spells out what operators of websites and online services must do to protect children's privacy and safety online. If you are a parent or guardian and believe your child is using the VIA Global Health Platform, please contact us. We may ask for proof of identification before we remove any information to prevent malicious removal of account information. If we discover on our own that a child is accessing the VIA Global Health Platform, we will delete the information as soon as we discover it, we will not use the information for any purpose, and we will not disclose the information to third parties. You acknowledge that we do not verify the age of our users nor do we have any liability to do so.
              </p>
            </section>

            <section className="mb-8" data-testid="section-changes">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changes to VIA's Privacy Policy</h2>
              <p className="text-slate-700 leading-relaxed">
                As necessary to address changes in laws or our business practices, we may modify our Privacy Policy, in whole or in part, to address these changes. We will change the "Last Updated" date at the beginning of this Privacy Policy. Any changes we make to our Privacy Policy are effective as of this Last Updated date and replace any prior Privacy Policies. We encourage you to continually review our Privacy Policy to make sure you still agree with it.
              </p>
            </section>

            <section data-testid="section-contact-privacy">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
              <p className="text-slate-700 leading-relaxed">
                If you have any questions about our Privacy Policy, please contact us using the Contact us link found at{" "}
                <a href="https://viaglobalhealth.com" className="text-blue-600 hover:underline" data-testid="link-privacy-via">www.viaglobalhealth.com</a>
                {" "}or{" "}
                <a href="https://viaglobalhealth.co.za" className="text-blue-600 hover:underline" data-testid="link-privacy-via-za">www.viaglobalhealth.co.za</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

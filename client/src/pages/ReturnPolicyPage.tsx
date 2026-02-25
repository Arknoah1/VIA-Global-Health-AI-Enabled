import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-slate prose-lg">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2" data-testid="heading-return-policy">
              Return Policy
            </h1>
            <p className="text-lg text-slate-600 mb-1" data-testid="text-return-subtitle">
              Product Delivery, Return & Warranty Information
            </p>
            <p className="text-sm text-slate-500 mb-8" data-testid="text-return-version">
              VIA Return Policy (v4, 4/18/20)
            </p>

            <section className="mb-8" data-testid="section-return-intro">
              <p className="text-slate-700 leading-relaxed">
                VIA Global Health's transaction, return, payment and refund services are available to VIA Verified Sellers "Supplier" and VIA Verified Buyers "Buyer" with VIA Membership that is in good standing. These terms apply solely to transactions initiated and completed through the VIA Marketplace and in accordance to VIA User Agreement.
              </p>
            </section>

            <section className="mb-8" data-testid="section-delivery-return-locations">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Product Delivery & Return Locations</h2>
              <ul className="list-disc pl-6 space-y-3 text-slate-700">
                <li>Delivery will occur at the location specified during the order process by the Buyer unless other arrangements are made and acknowledged in writing by VIA customer service. Returns will be made to the Supplier's address indicated on the order and shipping documents.</li>
                <li>The Buyer may cancel the transaction and request a full refund before Supplier begins shipping process. If the Supplier proceeds to ship product, the Buyer is not obliged to take delivery. If the Buyer cancels the order after the shipment has taken place the Buyer is responsible for costs of shipping, return and restocking fee.</li>
                <li>Unless stated otherwise, transfer of the risk for loss or damage occurs when the product leaves the Sellers facility.</li>
                <li>Products must not contain any illegal or hazardous materials. Suppliers assume all risk and responsibility for products outside of the VIA Marketplace listing policy and relevant service and membership agreement. Shipments outside of these policies are subject to loss of membership.</li>
              </ul>
            </section>

            <section className="mb-8" data-testid="section-inspection-acceptance">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Inspection and Acceptance</h2>
              <p className="text-slate-700 leading-relaxed">
                After Buyer completes signature of delivery and initial acceptance they are required to complete prima facie inspection, defined as initial inspection for damage, missing components or parts as detailed in package contents, and visibly apparent defects in manufacturing of product. The scope of inspection for prima facie conformity includes but is not limited to the shape, size, weight, color, model, and condition of product.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                Buyer must notify VIA Global Health within 72 hours of any product which does not pass prima facie inspection.
              </p>
            </section>

            <section className="mb-8" data-testid="section-quality-products">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Quality of Products</h2>
              <p className="text-slate-700 leading-relaxed">
                Supplier is solely responsible for ensuring products match the description and images on the VIA Marketplace. If the product does not match the stated specifications the Buyer should provide as much documentation of misrepresentation or defect(s), whether visible or during intended use.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                If the product is not in conformity with description, product condition or functionality, the Buyer will provide VIA with documentation and VIA will provide a guarantee to the Buyer for full refund for costs processed through the VIA Platform, if notified within 72 hours of delivery. After this period the manufacture or Supplier's warranty supersedes all agreements. If the Buyer fails to provide supporting documentation they assume all liability for the product and it is up to the Supplier to decide whether or not to accept the return.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                If a product is submitted for return or refund with supporting documentation, the Supplier is allowed to challenge the Buyer's supporting documentation. If an agreement between the two parties cannot be reach within 14 calendar days, the matter will be decided by a VIA internal review board based on available documentation by both parties.
              </p>
            </section>

            <section className="mb-8" data-testid="section-failure-deliver">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Failure to Deliver</h2>
              <p className="text-slate-700 leading-relaxed">
                The Buyer assumes all liability for products in shipment. If a shipment is lost or damaged during delivery, it is the responsibility of the Buyer. VIA will by default include insurance on all transactions we arrange either door to port or door to door as required by the Buyer. It is highly recommended that Supplier set up shipping insurance for all products where they initiate the shipping or for any last mile delivery. VIA is only responsible for shipping to the address, which the Buyer entered when purchasing the product. If the Buyer has entered an incorrect shipping address and the supplier has documented proper delivery to that address, the Buyer assumes all liability for the delivered shipment. If VIA has proven that the shipping company has delivered the product to the agreed upon address but the Buyer has failed to acknowledge receipt of the shipment, the shipment will be considered delivered.
              </p>
            </section>

            <section className="mb-8" data-testid="section-warranty">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Warranty</h2>
              <p className="text-slate-700 leading-relaxed">
                All products sold on the VIA Global Health Marketplace are subject to manufacturer's limited warranties. VIA is not liable for damaged or defective products.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                When a dispute arises between a Buyer and Supplier regarding a transaction on the VIA Marketplace, we encourage both parties to negotiate with each other to resolve the dispute. Upon request, VIA will assist both parties in reaching an agreement. If a resolution can not be finalized within 14 business days, the complaint and supporting documentation will be submitted to VIA's internal customer review panel. VIA, reserves the right of sole discretion in resolving customer service inquiries and member complaints.
              </p>
            </section>

            <section className="mb-8" data-testid="section-returns">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Returns</h2>
              <p className="text-slate-700 leading-relaxed">
                To initiate a return, please submit a return form within 72hrs of receiving product. You will be asked to specify invoice #, which items are being returned and why they are being returned along with your membership information.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                If the product is defective or has been damaged in transit, a VIA representative will be in touch with you within 24hrs of initiating the return claim.
              </p>
            </section>

            <section className="mb-8" data-testid="section-completing-return">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Completing Return of Products</h2>
              <p className="text-slate-700 leading-relaxed">
                The Buyer and VIA may discuss terms and logistics about whether and how Buyer may return the products to Supplier. Products must be returned in the same condition as they were delivered, and Buyer must ship through a VIA approved shipping company.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                The Buyer is responsible for providing Supplier and VIA shipping information of returned products, including but not limited to cost and tracking number. Failure to do so will make the Buyer responsible for full cost of shipment and payment.
              </p>
            </section>

            <section className="mb-8" data-testid="section-return-fees-refunds">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Return Fees and Refunds</h2>
              <p className="text-slate-700 leading-relaxed">
                VIA product return and refund policies are superseded by the Supplier return and warranty policies as stated on the VIA Marketplace websites at the time of transaction. When not explicitly superseded, VIA Return policies, fees and refunds are as follows.
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-3 text-slate-700">
                <li>For "no fault" returns, the Buyer is required to pay shipping costs, and associated fees and tariffs if return is initiated within 72hrs of receipt of product.</li>
                <li>Defective or damaged product returns are subject to a 100% refund of payments processed through the VIA Marketplace, and guaranteed to Buyer through their purchase on the VIA Marketplace if return request is submitted within 72hrs of receipt of product. The refund is strictly limited to no more than the total order payment made through the VIA Marketplace.</li>
                <li>All other returns are to be made in accordance with product's warranty.</li>
                <li>VIA maintains the right to alter or change the return policy as necessary to maintain the marketplace.</li>
              </ul>
            </section>

            <section className="mb-8" data-testid="section-refund-time-period">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Refund Time Period</h2>
              <ul className="list-disc pl-6 space-y-3 text-slate-700">
                <li>Credit cards will be refunded within 5 days of final approval.</li>
                <li>Wire transfer refunds may take up to fifteen (15) business days to process once completed.</li>
              </ul>
            </section>

            <section className="mb-8" data-testid="section-resolving-disputes">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Resolving Disputes</h2>
              <p className="text-slate-700 leading-relaxed">
                As with all business transactions, document should be kept by each party. Both parties involved in the dispute must notify VIA within two business days of issuing or receiving notice of a dispute regarding products, purchases, and shipments through the VIA Marketplace.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                In the event of any product or shipping dispute, VIA reserves the right to request supporting documentation from each party and retains sole discretion to make a decision it deems appropriate. In the interest of providing an honest and business friendly marketplace that protects legitimate Buyers and Suppliers, violations of Membership rules in regards to falsified or inaccurate documentation by either party, is grounds for loss of membership and potential legal action.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
/*jshint indent:2, curly:true eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true */

(function () {
  "use strict";

  /**
    @class

    @extends XM.Document
  */
  XM.Quote = XM.Document.extend({
    /** @scope XM.Quote.prototype */

    recordType: 'XM.Quote',

    defaults: function () {
      var //settings = XT.session.getSettings(),
          today = new Date();

      return {
        //auto order #
        quoteDate: today,
        //tax zone: none
        //site: probably the metric default
        //sale type: same
        quoteStatus: "Open"
        //shipping zone: probably the metric default
      };
    },
    
    /*
      calculated fields used by the line items panel
    */
    margin: 0.0,
    freightWeight: 0.0,
    subtotal: 0.0,
    tax: 0.0,
    total: 0.0,

    requiredAttributes: [
      "id",
      "number",
      "quoteDate",
      "items", //at least 1 line item?
      "customer",
      "miscCharge",
      "calculateFreight"
    ],
    
    billtoAttrArray: ["billtoName", "billtoAddress1", "billtoAddress2", "billtoAddress3", "billtoCity",
                        "billtoState", "billtoPostalCode", "billtoCountry", "billtoPhone", "billtoContactHonorific",
                        "billtoContactFirstName", "billtoContactMiddleName", "billtoContactLastName",
                        "billtoContactSuffix", "billtoContactPhone", "billtoContactTitle",
                        "billtoContactFax", "billtoContactEmail"],

    shiptoAttrArray: ["shiptoName", "shiptoAddress1", "shiptoAddress2", "shiptoAddress3", "shiptoCity",
                        "shiptoState", "shiptoPostalCode", "shiptoCountry", "shiptoPhone", "shiptoContactHonorific",
                        "shiptoContactFirstName", "shiptoContactMiddleName", "shiptoContactLastName",
                        "shiptoContactSuffix", "shiptoContactPhone", "shiptoContactTitle",
                        "shiptoContactFax", "shiptoContactEmail"],
    
    // ..........................................................
    // METHODS
    //
    
    /**
      Initialize
    */
    initialize: function () {
      XM.Document.prototype.initialize.apply(this, arguments);
      this.on('add:item remove:item', this.itemsDidChange);
      this.on('change:customer', this.billtoDidChange);
      this.on('change:shipto', this.shiptoDidChange);
      var status = this.getStatus();
      if (!this.get("billtoName") && (status === XM.Model.READY_NEW)) {
        this.setReadOnly("items", true);
        for (var i = 0; i < this.billtoAttrArray.length; i++) {
          this.setReadOnly(this.billtoAttrArray[i], true);
        }
        for (i = 0; i < this.shiptoAttrArray.length; i++) {
          this.setReadOnly(this.shiptoAttrArray[i], true);
        }
      }
    },
    
    /**
      itemsDidChange
      
      Used to update calculated fiels.
      Called when the user adds or removes a line item.
    */
    itemsDidChange: function (model, value, options) {
      var that = this,
        changed;
      //this.margin = 0.0;
      //this.freightWeight = 0.0;
      this.subtotal = 0.0;
      this.tax = 0.0;
      this.total = 0.0;

      //Total up everything
      _.each(this.get('items').models, function (item) {
        //margin stuff
        //freightWeight stuff
        that.subtotal = XT.math.add(that.subtotal,
          item.get('listPrice'), XT.MONEY_SCALE);
      });

      // Notify change
      changed = {
        //margin: this.margin,
        //freightWeight: this.freightWeight,
        subtotal: this.subtotal,
        tax: this.tax,
        total: this.total
      };
      this.trigger("change", this, changed);
    },
    
    /**
      billtoDidChange
    */
    billtoDidChange: function (model, value, options) {
      var theValue = value;
        
      if (theValue) {
        for (var i = 0; i < this.billtoAttrArray.length; i++) {
          this.setReadOnly(this.billtoAttrArray[i], false);
        }
        for (i = 0; i < this.shiptoAttrArray.length; i++) {
          this.setReadOnly(this.shiptoAttrArray[i], false);
        }
        //I want to use a for loop here but I can't due
        //  due to the wonkiness of CustomerProspectRelation.
        //  Will look into it later.
        //  Also, for some reason we decided to call the contact "billingContact" for Customer
        //    and just "contact" for Prospect, hence the almost-duplicate code below.
        if (theValue.editableModel === "XM.Customer") {
          this.set("billtoName", theValue.get("name"));
          this.set("billtoAddress1", theValue.getValue("billingContact.address.line1"));
          this.set("billtoAddress2", theValue.getValue("billingContact.address.line2"));
          this.set("billtoAddress3", theValue.getValue("billingContact.address.line3"));
          this.set("billtoCity", theValue.getValue("billingContact.address.city"));
          this.set("billtoState", theValue.getValue("billingContact.address.state"));
          this.set("billtoPostalCode", theValue.getValue("billingContact.address.postalCode"));
          this.set("billtoCountry", theValue.getValue("billingContact.address.country"));
          //the code below sets the shipTo of this quote as the default for this cust if shipto is empty.
          if (!this.get("shipto")) {
            this.set("shipto", theValue.get("defaultShipto"));
          }
          
        }
        else if (theValue.editableModel === "XM.Prospect") {
          this.set("billtoName", theValue.get("name"));
          this.set("billtoAddress1", theValue.getValue("contact.address.line1"));
          this.set("billtoAddress2", theValue.getValue("contact.address.line2"));
          this.set("billtoAddress3", theValue.getValue("contact.address.line3"));
          this.set("billtoCity", theValue.getValue("contact.address.city"));
          this.set("billtoState", theValue.getValue("contact.address.state"));
          this.set("billtoPostalCode", theValue.getValue("contact.address.postalCode"));
          this.set("billtoCountry", theValue.getValue("contact.address.country"));
        }
      }
      
    },
    
    /**
      shiptoDidChange
    */
    shiptoDidChange: function (model, value, options) {
      var theValue = value;
      
      if (theValue) {
        for (var i = 0; i < this.shiptoAttrArray.length; i++) {
          this.setReadOnly(this.shiptoAttrArray[i], false);
        }
        if (theValue.editableModel === "XM.CustomerShipto") {
          this.set("shiptoName", theValue.get("name"));
          this.set("shiptoAddress1", theValue.getValue("contact.address.line1"));
          this.set("shiptoAddress2", theValue.getValue("contact.address.line2"));
          this.set("shiptoAddress3", theValue.getValue("contact.address.line3"));
          this.set("shiptoCity", theValue.getValue("contact.address.city"));
          this.set("shiptoState", theValue.getValue("contact.address.state"));
          this.set("shiptoPostalCode", theValue.getValue("contact.address.postalCode"));
          this.set("shiptoCountry", theValue.getValue("contact.address.country"));
        }
      }
    },
    
    /**
      copyBilltoToShipto
    */
    copyBilltoToShipto: function () {
      for (var i = 0; i < this.billtoAttrArray.length; i++) {
        this.set(this.shiptoAttrArray[i], this.billtoAttrArray[i]);
      }
    }
    
  });
  
  /**
    @class

    @extends XM.Comment
  */
  XM.QuoteComment = XM.Comment.extend({
    /** @scope XM.QuoteComment.prototype */

    recordType: 'XM.QuoteComment',

    sourceName: 'Q'

  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteAccount = XM.Model.extend({
    /** @scope XM.QuoteAccount.prototype */
  
    recordType: 'XM.QuoteAccount',
    
    isDocumentAssignment: true
    
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteContact = XM.Model.extend({
    /** @scope XM.QuoteContact.prototype */
  
    recordType: 'XM.QuoteContact',
    
    isDocumentAssignment: true
    
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteFile = XM.Model.extend({
    /** @scope XM.QuoteFile.prototype */
  
    recordType: 'XM.QuoteFile',
  
    isDocumentAssignment: true
  
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteItem = XM.Model.extend({
    /** @scope XM.QuoteItem.prototype */
  
    recordType: 'XM.QuoteItem',
  
    isDocumentAssignment: true
  
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteLine = XM.Model.extend({
     /** @scope XM.QuoteLine.prototype */
  
    recordType: 'XM.QuoteLine'
  
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteLineCharacteristic = XM.Model.extend({
    /** @scope XM.QuoteLineCharacteristic.prototype */
  
    recordType: 'XM.QuoteLineCharacteristic'
  
  });
  
  /**
    @class

    @extends XM.Info
  */
  XM.QuoteListItem = XM.Info.extend({
    /** @scope XM.QuoteListItem.prototype */

    recordType: 'XM.QuoteListItem',

    editableModel: 'XM.Quote'

  });
  
  /**
    @class

    @extends XM.Info
  */
  XM.QuoteRelation = XM.Info.extend({
    /** @scope XM.QuoteRelation.prototype */

    recordType: 'XM.QuoteRelation',

    editableModel: 'XM.Quote',

    descriptionKey: "number"

  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteUrl = XM.Model.extend({
    /** @scope XM.QuoteUrl.prototype */
  
    recordType: 'XM.QuoteUrl',
  
    isDocumentAssignment: true
  
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteProject = XM.Model.extend({
     /** @scope XM.QuoteProject.prototype */
  
    recordType: 'XM.QuoteProject',
  
    isDocumentAssignment: true
  
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteIncident = XM.Model.extend({
     /** @scope XM.QuoteIncident.prototype */
  
    recordType: 'XM.QuoteIncident',
  
    isDocumentAssignment: true
  
  });
  
  /**
    @class

    @extends XM.Model
  */
  XM.QuoteOpportunity = XM.Model.extend({
    /** @scope XM.QuoteOpportunity.prototype */
  
    recordType: 'XM.QuoteOpportunity',
  
    isDocumentAssignment: true
  
  });

  /*
    @extends XM.Model
  */
  XM.QuoteCustomer = XM.Model.extend({
    /** @scope XM.QuoteCustomer.prototype */

    recordType: 'XM.QuoteCustomer',

    isDocumentAssignment: true

  });
  
  /*
    @extends XM.Model
  */
  XM.QuoteToDo = XM.Model.extend({
    
    recordType: 'XM.QuoteToDo',
    
    isDocumentAssignment: true
    
  });

  // ..........................................................
  // COLLECTIONS
  //

  /**
    @class

    @extends XM.Collection
  */
  XM.QuoteListItemCollection = XM.Collection.extend({
    /** @scope XM.QuoteListItemCollection.prototype */

    model: XM.QuoteListItem

  });
  
  /**
    @class

    @extends XM.Collection
  */
  XM.QuoteRelationCollection = XM.Collection.extend({
    /** @scope XM.QuoteRelationCollection.prototype */

    model: XM.QuoteRelation

  });
  
  /**
    @class

    @extends XM.Collection
  */
  XM.QuoteSiteCollection = XM.Collection.extend({
    /** @scope XM.QuoteSiteCollection.prototype */

    model: XM.QuoteSite

  });
  
  /**
    @class

    @extends XM.Collection
  */
  XM.QuoteSaleTypeCollection = XM.Collection.extend({
    /** @scope XM.QuoteSaleTypeCollection.prototype */

    model: XM.QuoteSaleType

  });

}());

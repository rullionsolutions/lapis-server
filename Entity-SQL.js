/*global x, _ */
"use strict";







// convert a label pattern (e.g. "{org} / {date}") to a SQL CONCAT() expression
// UC1 - one token, nothing else, e.g. "{field}" should return "[alias.]field_expr"
// UC2 - one token, preceding static, e.g. "Blah {field}" should return "CONCAT('Blah ', [alias.]field_expr)"
// UC3 - two tokens, static in between, e.g. "{field1} / {field2}" should return "CONCAT([alias.]field1_expr, ' / ', [alias.]field2_expr)"
// UC4 - no tokens, static, e.g. "Blah", should return "'Blah'"
x.data.Entity.define("getPatternConcatExpr", function (pattern, alias) {
    var out,
        parts = 0;

    pattern = pattern || this.label_pattern;
    out = this.detokenize(pattern,
        function (token) {
            parts += 1;
            return (parts > 1 ? ", " : "") + this.getField(token).getDBTextExpr(alias);
        },
        function (non_token) {
            if (!non_token) {
                return "";
            }
            parts += 1;
            return (parts > 1 ? ", " : "") + Connection.escape(non_token);
        }
    );
    if (parts > 1) {
        out = "CONCAT(" + out + ")";
    }
    return out;
});


x.data.Entity.define("getAutoCompleterQuery", function () {
    var that = this,
        query = this.getQuery(true, true);          // default sort, skip adding columns

    query.get_found_rows  = false;
    query.main.addColumn({ name: "_key", visible: true });

    function addField(field_id) {
        var field = that.getField(field_id);
        if (!field) {
            that.throwError("unrecognized autocompleter field: " + field_id);
        }
        query.addColumn({ name: "match_term", visible: true, sql_function: field.sql_function || field.id });
    }

           if (this.autocompleter_pattern) {
        query.addColumn({ name: "match_term", visible: true, sql_function: this.getPatternConcatExpr(this.autocompleter_pattern) });

    } else if (this.autocompleter_field) {
        addField(this.autocompleter_field);

    } else if (this.label_pattern) {
        query.addColumn({ name: "match_term", visible: true, sql_function: this.getPatternConcatExpr(this.label_pattern) });

    } else if (this.title_field) {
        addField(this.title_field);

    } else {
        this.throwError("no match field defined");
    }
    return query;
});


x.data.Entity.define("addAutoCompleterSelectionCondition", function (query, match_term) {
    var condition = "_key LIKE " + Connection.escape(match_term + "%")            // make case-insensitive
                  + " OR UPPER(match_term) LIKE UPPER(" + Connection.escape("%" + match_term + "%") + ")";
    query.addCondition({ full_condition: condition, type: 'H'  /* HAVING */ });
});


x.data.Entity.define("addAutoCompleterFilterCondition", function (query) {
    if (this.selection_filter) {
        query.addCondition({ full_condition: this.selection_filter });
    }
});


x.data.Entity.define("unisrch", function (session, query_str, out, count, limit) {
    var added = 0,
        display_page,
        allowed = { access: false },
        query;

    display_page = this.getDisplayPage();
    if (!display_page) {
        this.debug("full_text_search entity has no display page: " + this.id);
        return 0;
    }
    display_page.checkBasicSecurity(session, allowed);
    if (!allowed.access) {
        this.debug("full_text_search entity display page is denied access: " + this.id);
        return 0;
    }

    query   = this.getAutoCompleterQuery();
    this.addAutoCompleterSelectionCondition(query, query_str);
    if (this.selection_filter) {
        query.addCondition({ full_condition: this.selection_filter });
    }
    if (typeof this.addSecurityCondition === "function") {
        this.addSecurityCondition(query, session);
    }

    while (query.next() && (count + added) < limit) {
        if (count + added > 0) {
            out.print( "\n" );
        }
        out.print(this.getUnisrchLine(query, display_page));
        added += 1;
    }
    query.reset();
    return added;
});


x.data.Entity.define("getUnisrchLine", function (query, display_page) {
    return    query.getColumn("A._key"    ).get().replace(/\|/g, "&#x007C;") +
        "|" + query.getColumn("match_term").get().replace(/\|/g, "&#x007C;") +
        "|" + display_page.id +
        "|" + this.title;
});


x.data.Entity.define("slimDataForTesting", function () {
    return undefined;
});


x.data.Entity.define("obfuscate", function () {
    this.each(function (field) {
        field.obfuscate();
    });
});



